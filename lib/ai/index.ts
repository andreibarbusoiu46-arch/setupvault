import "server-only";

import { AnthropicProvider } from "@/lib/ai/anthropic";
import { MockAIProvider } from "@/lib/ai/mock";
import { AIError, type AIProvider } from "@/lib/ai/provider";

const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * Which provider is configured. Read on the server only.
 *
 * `mock` is opt-in and explicit. A missing or misconfigured real provider
 * fails — it never silently falls back to fabricated analysis, because output
 * that looks like a model read your chart when nothing did is worse than an
 * error message.
 */
export function isMockProvider(): boolean {
  return (process.env.AI_PROVIDER ?? "").trim().toLowerCase() === "mock";
}

export function getAIProvider(): AIProvider {
  const configured = (process.env.AI_PROVIDER ?? "real").trim().toLowerCase();

  if (configured === "mock") {
    return new MockAIProvider();
  }

  if (configured !== "real" && configured !== "anthropic") {
    throw new AIError(
      "not_configured",
      `Unknown AI_PROVIDER: ${configured}. Use "real" or "mock".`,
    );
  }

  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    throw new AIError(
      "not_configured",
      'AI_API_KEY is not set. Set it, or use AI_PROVIDER=mock for development.',
    );
  }

  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
  return new AnthropicProvider(apiKey, model);
}

export { AIError };
export type { AIProvider };
