import "server-only";

import {
  ApiError,
  GoogleGenAI,
  ThinkingLevel,
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

/**
 * One deadline for the whole call, not one per attempt.
 *
 * This was three attempts of 60s plus backoff — a 182s worst case inside a
 * route whose own `maxDuration` is 60s, and 30s on semantic search. The
 * platform would kill the function mid-retry and the caller would get a
 * generic gateway timeout instead of the clean, typed error this provider
 * takes care to produce. A retry budget larger than the deadline it runs
 * under is not a retry budget.
 *
 * So: the caller states how long it has, every attempt draws from that one
 * budget, and a retry is only started if there is enough left for it to
 * plausibly finish. `DEADLINE_MS` is the default and sits under the tightest
 * route, with room left for the database writes that follow.
 */
const DEADLINE_MS = 25_000;
/** No single attempt may eat the entire budget and leave nothing for a retry. */
const ATTEMPT_CAP_MS = 20_000;
/** Below this much remaining, a retry cannot plausibly finish. Give up cleanly. */
const MIN_RETRY_BUDGET_MS = 4_000;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [600, 1_600];

/**
 * Room for the model to think, on top of the JSON we actually want.
 *
 * Gemini 3.x reasons before answering, and `maxOutputTokens` caps thinking
 * and output *combined* — it is not a budget for the reply alone. A limit
 * sized for the JSON therefore gets spent on reasoning, and the call returns
 * HTTP 200 with an empty candidate and `finishReason: MAX_TOKENS`. The
 * caller asked for 2,400 tokens of analysis and got nothing, with no error
 * from the API to explain it.
 *
 * So the caller's `maxTokens` stays what it means — the size of the answer —
 * and this is added for the reasoning. `thinkingLevel` is held low because
 * these are extraction and classification tasks against a schema, not open
 * problems: the schema does most of the structuring that thinking would
 * otherwise have to.
 */
const THINKING_HEADROOM_TOKENS = 6_000;

/**
 * Gemini accepts a subset of JSON Schema, so `$schema` — a dialect
 * declaration the API has no use for — is removed.
 *
 * `additionalProperties` is kept. An earlier version of this stripped it too,
 * on the stated grounds that "the Gemini schema dialect does not accept it".
 * That was wrong: Google's structured-output documentation lists it among the
 * supported object keywords. Keeping it is also the better of the two, since
 * it constrains generation rather than leaving the Zod parse to reject a
 * stray key after the tokens have been paid for.
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
      if (key === "$schema") continue;
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
    deadlineMs = DEADLINE_MS,
  }: CompletionRequest<T>): Promise<CompletionResult<T>> {
    const startedAt = Date.now();
    const remaining = () => deadlineMs - (Date.now() - startedAt);
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
      // Whatever is left of the shared budget, capped so that one slow
      // attempt cannot consume the lot. The abort reaches the SDK, so a
      // request we stopped waiting for is actually cancelled rather than
      // left running against the provider.
      const left = remaining();
      if (left <= 0) {
        throw new AIError("timeout", "The analysis took too long.");
      }
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(left, ATTEMPT_CAP_MS),
      );

      let response: GenerateContentResponse;
      try {
        response = await this.client.models.generateContent({
          model: this.model,
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseJsonSchema,
            // The caller's budget is for the answer; the reasoning needs its
            // own room inside the same cap. See THINKING_HEADROOM_TOKENS.
            maxOutputTokens: maxTokens + THINKING_HEADROOM_TOKENS,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
        const pause = BACKOFF_MS[attempt] ?? 1_600;
        if (
          isTransient(error) &&
          attempt < MAX_ATTEMPTS - 1 &&
          remaining() - pause > MIN_RETRY_BUDGET_MS
        ) {
          await sleep(pause);
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
        const pause = BACKOFF_MS[attempt] ?? 1_600;
        if (
          attempt < MAX_ATTEMPTS - 1 &&
          remaining() - pause > MIN_RETRY_BUDGET_MS
        ) {
          await sleep(pause);
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
