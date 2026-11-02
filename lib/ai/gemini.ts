import "server-only";

import {
  ApiError,
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { z } from "zod";

import { extractJson } from "@/lib/ai/json";
import {
  AIError,
  type AIProvider,
  type CompletionRequest,
  type CompletionResult,
  type TokenUsage,
} from "@/lib/ai/provider";

/**
 * Google Gemini, through the official `@google/genai` SDK.
 *
 * Implements the same one-method interface as every other provider here, so
 * nothing in the feature code knows which model answered. Selected with
 * `AI_PROVIDER=gemini`; the key is read from the server environment only and
 * this module imports `server-only`, so the build fails if it is ever reached
 * from a client component.
 *
 * Three things are worth knowing about this implementation.
 *
 * It asks Gemini for the schema rather than describing it in prose. The Zod
 * schemas the application already validates against are converted to JSON
 * Schema and handed to `responseJsonSchema`, so the model is constrained at
 * generation time instead of being asked nicely and corrected afterwards. The
 * Zod parse still runs on the way back — the schema being sent is not proof
 * that what returns conforms to it, and a provider that changes its
 * constrained-decoding behaviour should fail our validation, not slip past it.
 *
 * Retries are bounded and only for errors that can succeed on a second
 * attempt. A 429 or a 5xx is worth one more try after a short wait; a 400 or
 * a 401 will fail identically forever, and retrying it just spends the user's
 * time. Nothing retries more than twice, and a timeout is never retried
 * because the caller's own deadline has already gone.
 *
 * Everything the user supplied — notes, titles, text inside a screenshot — is
 * passed as user content, never merged into the system instruction. Screenshot
 * text in particular is untrusted: it is whatever was on someone's screen, and
 * it reaches the model inside the same fence as the rest of the user content.
 */

const DEFAULT_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 60_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [600, 1_600];

/**
 * Gemini accepts a subset of JSON Schema. Two of the keywords Zod emits are
 * outside it, so they are removed rather than sent and rejected:
 *
 * - `$schema`, a dialect declaration the API has no use for.
 * - `additionalProperties`, which the Gemini schema dialect does not accept.
 *   Dropping it costs nothing here: the Zod parse on the way back is what
 *   actually rejects an unexpected key, and it still runs.
 *
 * `$ref` and `$defs` are not handled because the conversion is asked to
 * inline reused subschemas, and a test asserts that none of the five schemas
 * produce either. If that ever changes the test fails rather than the API.
 */
export function toGeminiSchema(schema: z.ZodType<unknown>): unknown {
  const json = z.toJSONSchema(schema as never, {
    io: "output",
    reused: "inline",
  });

  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (!node || typeof node !== "object") return node;

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === "$schema" || key === "additionalProperties") continue;
      out[key] = strip(value);
    }
    return out;
  };

  return strip(json);
}

function readUsage(response: GenerateContentResponse): TokenUsage | undefined {
  const u = response.usageMetadata;
  if (!u) return undefined;
  return {
    inputTokens: u.promptTokenCount,
    outputTokens: u.candidatesTokenCount,
    totalTokens: u.totalTokenCount,
  };
}

/** Which failures are worth one more attempt. */
export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 429 || error.status >= 500;
  }
  return false;
}

export function translate(error: unknown): AIError {
  if (error instanceof AIError) return error;

  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return new AIError("unauthorized", "The AI credentials were rejected.");
    }
    if (error.status === 429) {
      return new AIError("rate_limited", "The provider is rate limiting us.");
    }
    if (error.status === 400) {
      // A 400 from Gemini is almost always our request, not the user's data.
      // The provider's own message can quote the prompt back, so it stays in
      // `reason` for the server log and never reaches the client.
      return new AIError("provider_error", "The request was rejected.", error);
    }
    return new AIError("provider_error", `Provider returned ${error.status}.`, error);
  }

  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new AIError("timeout", "The analysis took too long.", error);
  }

  return new AIError("provider_error", "Could not reach the provider.", error);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async complete<T>({
    systemPrompt,
    userContent,
    image,
    schema,
    maxTokens = 2000,
  }: CompletionRequest<T>): Promise<CompletionResult<T>> {
    const parts: Part[] = [];

    // The image first, then the text that refers to it — the order Gemini's
    // own multimodal guidance recommends for a single image with a prompt.
    if (image) {
      parts.push({
        inlineData: { mimeType: image.mediaType, data: image.data },
      });
    }
    parts.push({ text: userContent });

    const responseJsonSchema = toGeminiSchema(schema as z.ZodType<unknown>);

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // A fresh deadline per attempt, and an abort that actually reaches the
      // SDK rather than leaving a request running after we stopped waiting.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let response: GenerateContentResponse;
      try {
        response = await this.client.models.generateContent({
          model: this.model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseJsonSchema,
            maxOutputTokens: maxTokens,
            // Analysis of a fixed chart should not wander between runs; the
            // caching layer upstream assumes identical inputs are worth
            // reusing, and a high temperature would make that a lie.
            temperature: 0.2,
            abortSignal: controller.signal,
          },
        });
      } catch (error) {
        clearTimeout(timer);
        lastError = error;
        if (isTransient(error) && attempt < MAX_ATTEMPTS - 1) {
          await sleep(BACKOFF_MS[attempt] ?? 1_600);
          continue;
        }
        throw translate(error);
      }
      clearTimeout(timer);

      // A blocked prompt returns 200 with no candidate, which would otherwise
      // read as an empty string and fail later as malformed JSON.
      const blocked = response.promptFeedback?.blockReason;
      if (blocked) {
        throw new AIError(
          "provider_error",
          "The provider declined to analyse this content.",
          blocked,
        );
      }

      const finish = response.candidates?.[0]?.finishReason;
      if (finish === "MAX_TOKENS") {
        // Truncated JSON is not worth a retry at the same budget.
        throw new AIError(
          "invalid_output",
          "The analysis was longer than the configured limit.",
          finish,
        );
      }

      const text = response.text?.trim() ?? "";
      if (!text) {
        lastError = new AIError("invalid_output", "The model returned nothing.", finish);
        if (attempt < MAX_ATTEMPTS - 1) {
          await sleep(BACKOFF_MS[attempt] ?? 1_600);
          continue;
        }
        throw lastError;
      }

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

      return {
        data: validated.data,
        model: response.modelVersion ?? this.model,
        usage: readUsage(response),
      };
    }

    throw translate(lastError);
  }
}
