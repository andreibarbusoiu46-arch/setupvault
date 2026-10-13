import type { ZodType } from "zod";

/** Errors the UI knows how to phrase. Provider detail never reaches the user. */
export type AIErrorCode =
  | "not_configured"
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "invalid_output"
  | "image_unavailable";

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly reason: unknown;

  constructor(code: AIErrorCode, message: string, reason?: unknown) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.reason = reason;
  }
}

export interface ImagePayload {
  mediaType: "image/png" | "image/jpeg" | "image/webp";
  /** Base64, without the data: prefix. */
  data: string;
}

/**
 * What the caller is asking for. The real provider ignores this — the prompt
 * already says it — but the mock needs to know which shape to produce.
 */
export type CompletionIntent =
  | "setup_analysis"
  | "auto_tagging"
  | "ocr_levels"
  | "semantic_search"
  | "score_explanation";

export interface CompletionRequest<T> {
  intent: CompletionIntent;
  systemPrompt: string;
  /** User-supplied content. Always passed separately from the system prompt. */
  userContent: string;
  image?: ImagePayload;
  schema: ZodType<T>;
  maxTokens?: number;
}

export interface CompletionResult<T> {
  data: T;
  model: string;
  /** True when the response came from the mock provider, never from a model. */
  mock?: boolean;
}

/**
 * The only surface the application talks to. Swapping providers means writing
 * one more implementation of this, not touching any feature code.
 */
export interface AIProvider {
  readonly name: string;
  complete<T>(request: CompletionRequest<T>): Promise<CompletionResult<T>>;
}
