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
import { checkAIUsage, recordAIUsage } from "@/services/ai-usage.service";
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

  const usage = await checkAIUsage(supabase, userId, tier, true);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, code: "usage_limit" },
      { status: 429 },
    );
  }

  try {
    const provider = getAIProvider();
    const { data, mock } = await provider.complete({
      intent: "ocr_levels",
      systemPrompt: OCR_PROMPT,
      userContent: wrapUserContent(
        `Direction: ${setup.direction}. Read the price levels marked on the attached chart.`,
      ),
      image,
      schema: ocrLevelsSchema,
      maxTokens: 500,
    });

    await recordAIUsage(admin, userId, "ai_ocr", true);

    const review = reviewOcrLevels(data, setup.direction);

    return NextResponse.json({ levels: data, review, mock: Boolean(mock) });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
