import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { tierLimit, type AIFeature } from "@/lib/feature-access";
import type { Database, SubscriptionTier } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface UsageVerdict {
  allowed: boolean;
  reason: string | null;
  used: number;
  limit: number | null;
}

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

  let query = supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
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

export async function recordAIUsage(
  admin: Client,
  userId: string,
  feature: AIFeature,
  usedVision: boolean,
): Promise<void> {
  const { error } = await admin
    .from("ai_usage")
    .insert({ user_id: userId, feature, used_vision: usedVision });

  if (error) console.error("Failed to record AI usage", { userId, feature, error });
}
