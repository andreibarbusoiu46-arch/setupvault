import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, AIAnalysisRow, AIAnalysisType } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Bumped when the prompt or output shape changes, which invalidates old caches. */
export const ANALYSIS_VERSION = 1;

/**
 * Reads use the caller's own client and are filtered by RLS. Writes use the
 * service-role client, because `setup_ai_analyses` deliberately has no
 * client-side insert or update policy — a browser must not be able to
 * fabricate an analysis. Every write still sets `user_id` from the verified
 * session, never from the request body.
 */

export async function findCachedAnalysis(
  supabase: Client,
  {
    userId,
    setupId,
    analysisType,
    inputHash,
  }: {
    userId: string;
    setupId: string;
    analysisType: AIAnalysisType;
    inputHash: string;
  },
): Promise<AIAnalysisRow | null> {
  const { data, error } = await supabase
    .from("setup_ai_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("setup_id", setupId)
    .eq("analysis_type", analysisType)
    .eq("input_hash", inputHash)
    .eq("status", "completed")
    .eq("analysis_version", ANALYSIS_VERSION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listAnalyses(
  supabase: Client,
  userId: string,
  setupId: string,
  analysisType: AIAnalysisType = "setup_analysis",
  limit = 10,
): Promise<AIAnalysisRow[]> {
  const { data, error } = await supabase
    .from("setup_ai_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("setup_id", setupId)
    .eq("analysis_type", analysisType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export class AnalysisInFlightError extends Error {
  constructor() {
    super("An analysis is already running for this setup.");
    this.name = "AnalysisInFlightError";
  }
}

/**
 * Claims the right to run. The partial unique index on
 * (setup_id, analysis_type) where status in (pending, processing) means a
 * second concurrent request fails at the database rather than starting a
 * second paid call — which is what happens the moment somebody double-clicks.
 */
export async function claimAnalysis(
  admin: Client,
  {
    userId,
    setupId,
    analysisType,
    inputHash,
    usedScreenshot,
  }: {
    userId: string;
    setupId: string;
    analysisType: AIAnalysisType;
    inputHash: string;
    usedScreenshot: boolean;
  },
): Promise<AIAnalysisRow> {
  const { data, error } = await admin
    .from("setup_ai_analyses")
    .insert({
      user_id: userId,
      setup_id: setupId,
      analysis_type: analysisType,
      input_hash: inputHash,
      used_screenshot: usedScreenshot,
      analysis_version: ANALYSIS_VERSION,
      status: "processing",
    })
    .select("*")
    .single();

  if (error) {
    // 23505 is the unique violation from the in-flight index.
    if ((error as { code?: string }).code === "23505") {
      throw new AnalysisInFlightError();
    }
    throw error;
  }

  return data;
}

export async function completeAnalysis(
  admin: Client,
  id: string,
  {
    result,
    model,
    confidence,
  }: { result: unknown; model: string; confidence: number | null },
): Promise<AIAnalysisRow> {
  const { data, error } = await admin
    .from("setup_ai_analyses")
    .update({
      status: "completed",
      result_json: result,
      model,
      confidence,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function failAnalysis(
  admin: Client,
  id: string,
  errorCode: string,
): Promise<void> {
  const { error } = await admin
    .from("setup_ai_analyses")
    .update({ status: "failed", error_code: errorCode })
    .eq("id", id);

  if (error) console.error("Could not mark analysis failed", { id, error });
}

/** Clears a stale claim so a later attempt is not blocked forever. */
export async function releaseStaleClaims(
  admin: Client,
  setupId: string,
  analysisType: AIAnalysisType,
  olderThanMinutes = 5,
): Promise<void> {
  const cutoff = new Date(
    Date.now() - olderThanMinutes * 60_000,
  ).toISOString();

  await admin
    .from("setup_ai_analyses")
    .update({ status: "failed", error_code: "timeout" })
    .eq("setup_id", setupId)
    .eq("analysis_type", analysisType)
    .in("status", ["pending", "processing"])
    .lt("created_at", cutoff);
}
