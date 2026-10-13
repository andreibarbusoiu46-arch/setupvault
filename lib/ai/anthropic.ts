import "server-only";

import { extractJson } from "@/lib/ai/json";
import {
  AIError,
  type AIProvider,
  type CompletionRequest,
  type CompletionResult,
} from "@/lib/ai/provider";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const TIMEOUT_MS = 60_000;

interface ContentBlock {
  type: string;
  text?: string;
}

/**
 * Anthropic implementation. Called only from route handlers — the key is read
 * from the server environment and never reaches a bundle, and this module
 * imports `server-only` so the build fails if that ever changes.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete<T>({
    systemPrompt,
    userContent,
    image,
    schema,
    maxTokens = 2000,
  }: CompletionRequest<T>): Promise<CompletionResult<T>> {
    const content: Record<string, unknown>[] = [];

    if (image) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType,
          data: image.data,
        },
      });
    }
    content.push({ type: "text", text: userContent });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content }],
        }),
      });
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AIError("timeout", "The analysis took too long.", error);
      }
      throw new AIError("provider_error", "Could not reach the provider.", error);
    }
    clearTimeout(timer);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AIError("unauthorized", "The AI credentials were rejected.");
      }
      if (response.status === 429) {
        throw new AIError("rate_limited", "The provider is rate limiting us.");
      }
      throw new AIError(
        "provider_error",
        `Provider returned ${response.status}.`,
      );
    }

    const body = (await response.json()) as {
      content?: ContentBlock[];
      model?: string;
    };

    const text = (body.content ?? [])
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")
      .trim();

    const parsed = extractJson(text);
    if (parsed === null) {
      throw new AIError("invalid_output", "The model did not return JSON.");
    }

    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      // Malformed output is discarded, never persisted.
      throw new AIError(
        "invalid_output",
        "The model returned an unexpected shape.",
        validated.error,
      );
    }

    return { data: validated.data, model: body.model ?? this.model };
  }
}
