import { NextResponse } from "next/server";

import { getAIProvider } from "@/lib/ai";
import { SETUP_ANALYSIS_PROMPT, wrapUserContent } from "@/lib/ai/prompts";
import { canUseFeature } from "@/lib/feature-access";
import { setupAnalysisSchema } from "@/features/ai/schemas";
import { buildInputHash } from "@/features/ai/utils/input-hash";
import {
  aiErrorResponse,
  describeSetup,
  getAdmin,
  loadAIContext,
  loadScreenshot,
} from "@/features/ai/server/context";
import {
  ANALYSIS_VERSION,
  AnalysisInFlightError,
  claimAnalysis,
  completeAnalysis,
  failAnalysis,
  findCachedAnalysis,
  releaseStaleClaims,
} from "@/services/ai-analysis.service";
import { checkAIUsage, recordAIUsage } from "@/services/ai-usage.service";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { setupId?: unknown; force?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const loaded = await loadAIContext(body.setupId, "ai_analysis");
  if (!loaded.ok) return loaded.response;

  const { userId, tier, setup } = loaded.context;
  const force = body.force === true;

  const wantsVision =
    Boolean(setup.screenshot_path) && canUseFeature(tier, "ai_vision");

  const inputHash = buildInputHash({
    version: ANALYSIS_VERSION,
    type: "setup_analysis",
    ticker: setup.ticker,
    market: setup.market,
    direction: setup.direction,
    entry: setup.entry,
    stopLoss: setup.stop_loss,
    takeProfit: setup.take_profit,
    riskReward: setup.risk_reward,
    result: setup.result,
    strategy: setup.strategy,
    tags: setup.tags,
    notes: setup.notes,
    tradedOn: setup.traded_on,
    screenshot: wantsVision ? setup.screenshot_path : null,
  });

  const supabase = await createClient();
  const admin = getAdmin();

  // A cached run for identical inputs costs nothing and returns instantly.
  if (!force) {
    const cached = await findCachedAnalysis(supabase, {
      userId,
      setupId: setup.id,
      analysisType: "setup_analysis",
      inputHash,
    });

    if (cached) {
      return NextResponse.json({ analysis: cached, cached: true });
    }
  }

  const usage = await checkAIUsage(supabase, userId, tier, wantsVision);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, code: "usage_limit", used: usage.used, limit: usage.limit },
      { status: 429 },
    );
  }

  await releaseStaleClaims(admin, setup.id, "setup_analysis");

  let claim;
  try {
    claim = await claimAnalysis(admin, {
      userId,
      setupId: setup.id,
      analysisType: "setup_analysis",
      inputHash,
      usedScreenshot: wantsVision,
    });
  } catch (error) {
    if (error instanceof AnalysisInFlightError) {
      return NextResponse.json(
        { error: "An analysis is already running for this setup.", code: "in_flight" },
        { status: 409 },
      );
    }
    return aiErrorResponse(error);
  }

  try {
    const image = wantsVision ? await loadScreenshot(setup.screenshot_path) : null;

    const provider = getAIProvider();
    const { data, model, mock } = await provider.complete({
      intent: "setup_analysis",
      systemPrompt: SETUP_ANALYSIS_PROMPT,
      userContent: wrapUserContent(
        image
          ? `${describeSetup(setup)}\n\nA chart screenshot for this setup is attached.`
          : `${describeSetup(setup)}\n\nNo chart screenshot is available for this setup.`,
      ),
      image: image ?? undefined,
      schema: setupAnalysisSchema,
      maxTokens: 2400,
    });

    const analysis = await completeAnalysis(admin, claim.id, {
      result: data,
      model,
      confidence: data.confidence,
    });

    await recordAIUsage(admin, userId, "ai_analysis", Boolean(image));

    return NextResponse.json({ analysis, cached: false, mock: Boolean(mock) });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "provider_error";

    await failAnalysis(admin, claim.id, code);
    return aiErrorResponse(error);
  }
}
