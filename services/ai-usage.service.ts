import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { tierLimit, type AIFeature } from "@/lib/feature-access";
import type { TokenUsage } from "@/lib/ai/provider";
import type { Database, SubscriptionTier } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface UsageVerdict {
  allowed: boolean;
  reason: string | null;
  used: number;
  limit: number | null;
  /** Seconds to wait, when the refusal is a burst limit rather than a quota. */
  retryAfter?: number;
}

/**
 * The burst window, which is a different question from the monthly quota.
 *
 * A quota stops someone using a month of analyses. It does nothing about
 * twenty requests fired in four seconds — each one is inside the quota right
 * up until the moment it is not, and in between they all reach the provider
 * concurrently and all get billed. The per-setup claim in
 * `ai-analysis.service` prevents duplicates for one setup; this bounds the
 * rate across all of them.
 *
 * Counted in the database rather than in memory on purpose. An in-process
 * counter is per-instance, and this deploys to a platform that will happily
 * run several instances — a limiter that resets whenever the request lands
 * somewhere else is a limiter in name only.
 */
const BURST = { windowSeconds: 60, maxRequests: 8 } as const;

function monthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/**
 * Usage is counted from the database, and the tier comes from the user's own
 * profile row — never from anything the browser sends. The ledger is written
 * with the service-role client because there is deliberately no client-side
 * insert policy on `ai_usage`.
 */
export async function checkAIUsage(
  supabase: Client,
  userId: string,
  tier: SubscriptionTier,
  usesVision: boolean,
): Promise<UsageVerdict> {
  const limit = tierLimit(tier, usesVision ? "vision" : "analyses");
  if (limit === null) {
    return { allowed: true, reason: null, used: 0, limit: null };
  }

  // Successes only. A provider outage must not burn a user's allowance —
  // they did not get an analysis, so they should not be charged one.
  let query = supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("succeeded", true)
    .gte("created_at", monthStart());

  if (usesVision) query = query.eq("used_vision", true);

  const { count, error } = await query;
  if (error) throw error;

  const used = count ?? 0;

  return {
    allowed: used < limit,
    reason:
      used < limit
        ? null
        : `You have used all ${limit} ${usesVision ? "chart analyses" : "AI analyses"} on your plan this month.`,
    used,
    limit,
  };
}

/**
 * Requests in the last minute, against the burst ceiling.
 *
 * Checked before the quota, because being told to wait ten seconds is a more
 * useful answer than being told a monthly limit is fine.
 */
export async function checkAIBurst(
  supabase: Client,
  userId: string,
): Promise<UsageVerdict> {
  const since = new Date(Date.now() - BURST.windowSeconds * 1000).toISOString();

  // Every attempt, successful or not. A request that reached the provider
  // cost money whatever it returned, so a failing one must still throttle —
  // otherwise the limit is bypassable by anything that reliably errors.
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) throw error;
  const used = count ?? 0;

  return {
    allowed: used < BURST.maxRequests,
    reason:
      used < BURST.maxRequests
        ? null
        : "Too many AI requests in a short time. Wait a moment and try again.",
    used,
    limit: BURST.maxRequests,
    retryAfter: used < BURST.maxRequests ? undefined : BURST.windowSeconds,
  };
}

export async function recordAIUsage(
  admin: Client,
  userId: string,
  feature: AIFeature,
  usedVision: boolean,
  usage?: TokenUsage,
  model?: string,
  succeeded = true,
): Promise<void> {
  const { error } = await admin.from("ai_usage").insert({
    user_id: userId,
    feature,
    used_vision: usedVision,
    succeeded,
    // Left null when the provider did not report a count, rather than
    // defaulted to zero. See the migration for why that distinction matters.
    input_tokens: usage?.inputTokens ?? null,
    output_tokens: usage?.outputTokens ?? null,
    total_tokens: usage?.totalTokens ?? null,
    model: model ?? null,
  });

  if (error) console.error("Failed to record AI usage", { userId, feature, error });
}

/**
 * A call that reached the provider and did not come back usable.
 *
 * Recorded so the burst window sees it. It is flagged `succeeded: false`, so
 * the monthly quota ignores it: the user is throttled for hammering, but not
 * billed an analysis they never received.
 */
export async function recordAIFailure(
  admin: Client,
  userId: string,
  feature: AIFeature,
  usedVision: boolean,
): Promise<void> {
  await recordAIUsage(admin, userId, feature, usedVision, undefined, undefined, false);
}
