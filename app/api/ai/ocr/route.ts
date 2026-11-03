import { NextResponse } from "next/server";

import { getAIProvider } from "@/lib/ai";
import { OCR_PROMPT, wrapUserContent } from "@/lib/ai/prompts";
import { ocrLevelsSchema } from "@/features/ai/schemas";
import { reviewOcrLevels } from "@/features/ai/utils/ocr-validation";
import {
  aiErrorResponse,
  getAdmin,
  loadAIContext,
  loadScreenshot,
} from "@/features/ai/server/context";
import {
  checkAIBurst,
  checkAIUsage,
  confirmAIUsage,
  reserveAIUsage,
} from "@/services/ai-usage.service";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Reads price levels off the chart and returns them as a suggestion. It never
 * writes to the setup, and the geometry is checked against the direction before
 * the values are offered at all.
 */
export async function POST(request: Request) {
  let body: { setupId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const loaded = await loadAIContext(body.setupId, "ai_ocr");
  if (!loaded.ok) return loaded.response;

  const { userId, tier, setup } = loaded.context;

  if (!setup.screenshot_path) {
    return NextResponse.json(
      { error: "This setup has no screenshot to read.", code: "no_image" },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  const admin = getAdmin();

  const image = await loadScreenshot(setup.screenshot_path);
  if (!image) {
    return NextResponse.json(
      { error: "The screenshot could not be read.", code: "image_unavailable" },
      { status: 422 },
    );
  }

  // Short-window ceiling, checked before the monthly quota: being told
  // to wait a moment is a more useful answer than being told the
  // month is fine while twenty concurrent requests bill in parallel.
  const burst = await checkAIBurst(supabase, userId);
  if (!burst.allowed) {
    return NextResponse.json(
      { error: burst.reason, code: "rate_limited" },
      { status: 429, headers: { "retry-after": String(burst.retryAfter ?? 60) } },
    );
  }

  const usage = await checkAIUsage(supabase, userId, tier, true);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, code: "usage_limit" },
      { status: 429 },
    );
  }

  try {
    // Claimed before the call, so a burst of concurrent requests sees
    // each other rather than all reading an empty window.
    const usageId = await reserveAIUsage(admin, userId, "ai_ocr", true);

    const provider = getAIProvider();
    const { data, model, mock, usage: tokens } = await provider.complete({
      intent: "ocr_levels",
      systemPrompt: OCR_PROMPT,
      userContent: wrapUserContent(
        `Direction: ${setup.direction}. Read the price levels marked on the attached chart.`,
      ),
      image,
      schema: ocrLevelsSchema,
      maxTokens: 500,
      // Under this route's own maxDuration of 60s, leaving room for
      // the database writes that follow.
      deadlineMs: 45_000,
    });

    await confirmAIUsage(admin, usageId, tokens, model);

    const review = reviewOcrLevels(data, setup.direction);

    return NextResponse.json({ levels: data, review, mock: Boolean(mock) });
  } catch (error) {
    // No write here: the reservation above is already the failure
    // record, and deleting it would restore the bypass it closes.
    return aiErrorResponse(error);
  }
}
