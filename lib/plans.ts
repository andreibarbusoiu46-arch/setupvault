import type { SubscriptionTier } from "@/types/database";

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: "Free plan",
  pro: "Pro plan",
  elite: "Elite plan",
};

export function planLabel(tier: SubscriptionTier) {
  return PLAN_LABELS[tier];
}
