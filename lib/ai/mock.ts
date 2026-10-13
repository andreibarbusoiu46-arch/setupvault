import "server-only";

import {
  AIError,
  type AIProvider,
  type CompletionRequest,
  type CompletionResult,
} from "@/lib/ai/provider";

/**
 * Development provider. Returns fully structured responses that satisfy the
 * same Zod schemas as the real one, so every layer downstream — validation,
 * persistence, history, caching, gating, loading and error states — is
 * exercised without a paid API call.
 *
 * Two things make it useful rather than decorative:
 *
 * 1. Output is *derived from the real setup*, not canned. The levels, the
 *    direction and the risk-to-reward in the response come from the record
 *    being analysed, so what you see on screen corresponds to the data you
 *    entered and a wrong wiring is visible immediately.
 * 2. It can be told to fail. AI_MOCK_FAILURE reproduces each provider error so
 *    the error states are testable, which is the half of the UI that otherwise
 *    never gets exercised until production.
 *
 * It is never a fallback. If the real provider is selected and misconfigured,
 * the request fails — it does not silently degrade to fabricated analysis.
 */

const DEFAULT_DELAY_MS = 900;

/** Pulls a labelled value out of the setup description sent to the model. */
function field(content: string, label: string): string | null {
  const match = content.match(
    new RegExp(`^${label}:\\s*(.+)$`, "im"),
  );
  const value = match?.[1]?.trim();
  if (!value || value === "not recorded" || value === "none") return null;
  return value;
}

function numberField(content: string, label: string): number | null {
  const raw = field(content, label);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasImage(hasScreenshot: boolean) {
  return hasScreenshot;
}

function buildSetupAnalysis(content: string, withImage: boolean) {
  const direction = field(content, "Direction") ?? "long";
  const ticker = field(content, "Ticker") ?? "the instrument";
  const strategy = field(content, "Strategy");
  const ratio = numberField(content, "Risk to reward");
  const entry = numberField(content, "Entry");
  const stop = numberField(content, "Stop loss");
  const target = numberField(content, "Take profit");
  const result = field(content, "Result") ?? "pending";

  const rrAssessment =
    ratio === null ? "unclear" : ratio >= 2 ? "good" : ratio >= 1 ? "acceptable" : "weak";

  const levelsComplete = entry !== null && stop !== null && target !== null;

  // Anything that depends on seeing a chart stays unclear without one — the
  // same rule the real prompt enforces.
  const visual = (likely: string) =>
    withImage
      ? { status: "possible" as const, explanation: likely, confidence: 0.61 }
      : {
          status: "unclear" as const,
          explanation: "No chart image was supplied, so this could not be assessed.",
          confidence: 0.12,
        };

  return {
    overallAssessment: `A ${direction} on ${ticker}${
      strategy ? ` recorded under the ${strategy} strategy` : ""
    }. ${
      levelsComplete
        ? "All three execution levels are present, so the plan can be read end to end."
        : "Some execution levels are missing, which limits how much can be said about the plan."
    }`,
    entryQuality: {
      assessment: entry === null ? "unclear" : "acceptable",
      explanation:
        entry === null
          ? "No entry price was recorded."
          : `Entry at ${entry} is documented alongside the direction and market.`,
      confidence: entry === null ? 0.15 : 0.72,
    },
    stopLossQuality: {
      assessment: stop === null ? "unclear" : "good",
      explanation:
        stop === null
          ? "No stop was recorded, so risk was not defined in advance."
          : `A stop at ${stop} defines the risk before the trade is taken.`,
      confidence: stop === null ? 0.15 : 0.78,
    },
    takeProfitQuality: {
      assessment: target === null ? "unclear" : "acceptable",
      explanation:
        target === null
          ? "No target was recorded."
          : `A target at ${target} gives the trade a defined exit.`,
      confidence: target === null ? 0.15 : 0.7,
    },
    riskRewardAssessment: {
      assessment: rrAssessment,
      explanation:
        ratio === null
          ? "Risk to reward could not be worked out from the levels given."
          : `The recorded ratio is ${ratio}R.`,
      confidence: ratio === null ? 0.2 : 0.83,
    },
    marketStructure: visual(
      `Structure on the visible range looks consistent with a ${direction} bias.`,
    ),
    liquidityAnalysis: visual(
      "There appears to be a wick through a prior level before the entry.",
    ),
    supportResistance: visual(
      "A horizontal level is visible near the recorded entry.",
    ),
    confluences: withImage
      ? ["Level visible near entry", strategy ?? "Named strategy"].filter(Boolean)
      : [],
    strengths: [
      levelsComplete ? "Entry, stop and target all recorded" : "Direction and market recorded",
      strategy ? `Strategy named as ${strategy}` : "Trade documented at all",
    ],
    weaknesses: [
      ratio !== null && ratio < 2
        ? "Risk to reward below 2R"
        : "Nothing significant in the recorded data",
      withImage ? "Timeframe is not recorded" : "No chart screenshot attached",
    ],
    improvementSuggestions: [
      withImage
        ? "Record the timeframe alongside the chart"
        : "Attach the chart you were looking at",
      result === "pending"
        ? "Record the outcome once the trade closes"
        : "Add a note on what you would do differently",
    ],
    uncertainty: withImage
      ? ["Exact timeframe and session are not stated in the record."]
      : [
          "No chart image was available, so nothing visual could be assessed.",
          "Market structure, liquidity and levels were not evaluated.",
        ],
    detectedPatterns: withImage
      ? [
          { name: "liquidity sweep", status: "possible" as const, confidence: 0.58 },
          { name: "break of structure", status: "unclear" as const, confidence: 0.31 },
        ]
      : [],
    confidence: withImage ? 0.68 : 0.42,
  };
}

function buildTags(content: string, withImage: boolean) {
  const strategy = field(content, "Strategy")?.toLowerCase();

  const base = withImage
    ? [
        { tag: "liquidity sweep", confidence: 0.64, rationale: "A wick through a prior level precedes the entry." },
        { tag: "order block", confidence: 0.52, rationale: "A consolidation sits just above the entry." },
        { tag: "retest", confidence: 0.47, rationale: "Price returns to the broken level before continuing." },
      ]
    : [
        { tag: "trend", confidence: 0.38, rationale: "Inferred from the direction and levels only; no chart was available." },
      ];

  if (strategy) {
    base.unshift({
      tag: strategy.slice(0, 30),
      confidence: 0.9,
      rationale: "Taken from the strategy you named on the setup.",
    });
  }

  return { tags: base };
}

function buildOcr(content: string) {
  const direction = field(content, "Direction") ?? "long";
  const long = direction === "long";

  // Geometrically coherent for the direction, so the validation layer accepts
  // it and the happy path is testable. Set AI_MOCK_FAILURE=ocr_mismatch to get
  // the refusal path instead.
  const entry = 312.5;

  if (process.env.AI_MOCK_FAILURE === "ocr_mismatch") {
    return {
      entry,
      stopLoss: long ? entry + 2.7 : entry - 2.7,
      takeProfit: long ? entry + 7.5 : entry - 7.5,
      confidence: 0.55,
      ambiguous: false,
      note: "Mock reading with levels on the wrong side, for testing.",
    };
  }

  if (process.env.AI_MOCK_FAILURE === "ocr_ambiguous") {
    return {
      entry,
      stopLoss: null,
      takeProfit: null,
      confidence: 0.3,
      ambiguous: true,
      note: "Numbers were visible but could not be assigned to levels.",
    };
  }

  return {
    entry,
    stopLoss: long ? entry - 2.7 : entry + 2.7,
    takeProfit: long ? entry + 7.5 : entry - 7.5,
    confidence: 0.74,
    ambiguous: false,
    note: "Levels read from the price scale on the right of the chart.",
  };
}

function buildSemanticQuery(content: string) {
  const text = content.toLowerCase();

  const has = (...terms: string[]) => terms.some((term) => text.includes(term));

  return {
    q: has("sweep", "liquidity") ? "liquidity sweep" : "",
    direction: has("long") ? "long" : has("short") ? "short" : "all",
    result: has("losing", "loss", "lost")
      ? "loss"
      : has("winning", "win")
        ? "win"
        : "all",
    market: has("crypto", "btc", "bitcoin")
      ? "crypto"
      : has("forex", "eurusd")
        ? "forex"
        : "all",
    strategy: "all",
    favorites: has("favourite", "favorite", "starred") ? "only" : "all",
    range: has("last month", "30 day", "last 30")
      ? "30d"
      : has("this week", "last 7", "7 day")
        ? "7d"
        : has("this year")
          ? "year"
          : "all",
    from: null,
    to: null,
    rr: has("2r", "2:1") ? "2" : "all",
    tags: has("sweep", "liquidity") ? ["liquidity sweep"] : [],
    semanticIntent: has("early", "too early")
      ? "early entry"
      : "mock interpretation of the request",
  };
}

function buildScoreExplanation(content: string) {
  const strategy = field(content, "Strategy");

  return {
    summary:
      "The score reflects how completely this setup was recorded. The levels and the strategy carried most of it; documentation cost the rest.",
    strongest: [
      "All three execution levels recorded",
      strategy ? `Strategy named as ${strategy}` : "Direction and market recorded",
    ],
    weakest: ["Documentation is thin", "No tags on this setup"],
  };
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async complete<T>({
    intent,
    userContent,
    image,
    schema,
  }: CompletionRequest<T>): Promise<CompletionResult<T>> {
    const delay = Number(process.env.AI_MOCK_DELAY_MS ?? DEFAULT_DELAY_MS);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, delay)));

    // Reproduces each real provider failure so the error paths are testable.
    const failure = process.env.AI_MOCK_FAILURE;
    if (failure === "timeout") {
      throw new AIError("timeout", "Mock timeout.");
    }
    if (failure === "rate_limited") {
      throw new AIError("rate_limited", "Mock rate limit.");
    }
    if (failure === "provider_error") {
      throw new AIError("provider_error", "Mock provider failure.");
    }
    if (failure === "unauthorized") {
      throw new AIError("unauthorized", "Mock credential rejection.");
    }
    if (failure === "invalid_output") {
      // Exercises the same path as a model returning an unusable shape.
      throw new AIError("invalid_output", "Mock malformed output.");
    }

    const withImage = hasImage(Boolean(image));

    const payload =
      intent === "setup_analysis"
        ? buildSetupAnalysis(userContent, withImage)
        : intent === "auto_tagging"
          ? buildTags(userContent, withImage)
          : intent === "ocr_levels"
            ? buildOcr(userContent)
            : intent === "semantic_search"
              ? buildSemanticQuery(userContent)
              : buildScoreExplanation(userContent);

    // The mock validates its own output against the same schema. If a mock
    // response ever drifts from the contract, it fails here rather than
    // shipping something the real provider would never produce.
    const validated = schema.safeParse(payload);
    if (!validated.success) {
      throw new AIError(
        "invalid_output",
        "The mock produced output that does not satisfy the schema.",
        validated.error,
      );
    }

    return { data: validated.data, model: "mock-provider", mock: true };
  }
}
