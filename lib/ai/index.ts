import "server-only";

import { AnthropicProvider } from "@/lib/ai/anthropic";
import { GeminiProvider } from "@/lib/ai/gemini";
import { MockAIProvider } from "@/lib/ai/mock";
import { AIError, type AIProvider } from "@/lib/ai/provider";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

/**
 * Which provider is configured. Read on the server only.
 *
 * `mock` is opt-in and explicit. A missing or misconfigured real provider
 * fails — it never silently falls back to fabricated analysis, because output
 * that looks like a model read your chart when nothing did is worse than an
 * error message.
 *
 * Gemini is the selected provider. Anthropic is kept rather than deleted
 * because keeping two real implementations is the only thing that actually
 * demonstrates the abstraction holds: an interface with one implementation is
 * a guess about what varies, and this one has now been tested twice.
 */
export function isMockProvider(): boolean {
  return (process.env.AI_PROVIDER ?? "").trim().toLowerCase() === "mock";
}

/**
 * Provider-specific first, generic second.
 *
 * `GEMINI_API_KEY` and `GEMINI_MODEL` are the documented names. The generic
 * `AI_API_KEY` / `AI_MODEL` are still read as a fallback so an existing
 * deployment keeps working through the change rather than failing at the
 * first request after a deploy.
 */
function read(specific: string, generic: string): string | undefined {
  return process.env[specific]?.trim() || process.env[generic]?.trim() || undefined;
}

function requireKey(name: string, provider: string): string {
  const key = read(name, "AI_API_KEY");
  if (!key) {
    throw new AIError(
      "not_configured",
      `${name} is not set. Set it to use AI_PROVIDER=${provider}, or use AI_PROVIDER=mock for development.`,
    );
  }
  return key;
}

export function getAIProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase();

  if (configured === "mock") {
    return new MockAIProvider();
  }

  if (configured === "gemini" || configured === "google") {
    return new GeminiProvider(
      requireKey("GEMINI_API_KEY", "gemini"),
      read("GEMINI_MODEL", "AI_MODEL") ?? DEFAULT_GEMINI_MODEL,
    );
  }

  if (configured === "anthropic" || configured === "real") {
    return new AnthropicProvider(
      requireKey("ANTHROPIC_API_KEY", "anthropic"),
      read("ANTHROPIC_MODEL", "AI_MODEL") ?? DEFAULT_ANTHROPIC_MODEL,
    );
  }

  throw new AIError(
    "not_configured",
    `Unknown AI_PROVIDER: ${configured}. Use "gemini", "anthropic" or "mock".`,
  );
}

export { AIError };
export type { AIProvider };
