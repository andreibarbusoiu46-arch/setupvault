import type { SubscriptionTier } from "@/types/database";

/**
 * One place decides what a tier can do. Nothing else in the codebase compares
 * a subscription tier directly, so Phase 7 changes limits here and nowhere
 * else — and no component can drift out of step with billing.
 */
export const AI_FEATURES = [
  "ai_analysis",
  "ai_vision",
  "ai_auto_tagging",
  "ai_ocr",
  "ai_pattern_recognition",
  "semantic_search",
] as const;

export type AIFeature = (typeof AI_FEATURES)[number];

export interface TierPolicy {
  features: readonly AIFeature[];
  /** Analyses per calendar month. Null means unmetered. */
  monthlyAnalyses: number | null;
  monthlyVisionAnalyses: number | null;
}

export const TIER_POLICIES: Record<SubscriptionTier, TierPolicy> = {
  free: {
    features: ["ai_analysis", "ai_vision"],
    monthlyAnalyses: 15,
    monthlyVisionAnalyses: 5,
  },
  pro: {
    features: AI_FEATURES,
    monthlyAnalyses: 300,
    monthlyVisionAnalyses: 150,
  },
  elite: {
    features: AI_FEATURES,
    monthlyAnalyses: null,
    monthlyVisionAnalyses: null,
  },
};

export const FEATURE_LABELS: Record<AIFeature, string> = {
  ai_analysis: "AI setup analysis",
  ai_vision: "Chart screenshot analysis",
  ai_auto_tagging: "AI auto-tagging",
  ai_ocr: "Price level extraction",
  ai_pattern_recognition: "Pattern recognition",
  semantic_search: "Semantic search",
};

export const FEATURE_DESCRIPTIONS: Record<AIFeature, string> = {
  ai_analysis: "A structured read of how a setup was put together.",
  ai_vision: "Reads the chart you attached, not just the numbers.",
  ai_auto_tagging: "Suggests chart structures and patterns to tag. You approve each one.",
  ai_ocr: "Reads price levels off the screenshot so you do not retype them.",
  ai_pattern_recognition: "Finds patterns across your own trading history.",
  semantic_search: "Search your vault in plain language.",
};

export function canUseFeature(
  tier: SubscriptionTier,
  feature: AIFeature,
): boolean {
  return TIER_POLICIES[tier].features.includes(feature);
}

export function tierLimit(
  tier: SubscriptionTier,
  kind: "analyses" | "vision",
): number | null {
  const policy = TIER_POLICIES[tier];
  return kind === "vision" ? policy.monthlyVisionAnalyses : policy.monthlyAnalyses;
}

/** The lowest tier that unlocks a feature, for the locked-state copy. */
export function requiredTier(feature: AIFeature): SubscriptionTier {
  const order: SubscriptionTier[] = ["free", "pro", "elite"];
  return order.find((tier) => canUseFeature(tier, feature)) ?? "elite";
}
