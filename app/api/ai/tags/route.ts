import { NextResponse } from "next/server";

import { getAIProvider } from "@/lib/ai";
import { AUTO_TAGGING_PROMPT, wrapUserContent } from "@/lib/ai/prompts";
import { suggestedTagsSchema } from "@/features/ai/schemas";
import {
  aiErrorResponse,
  describeSetup,
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
 * Returns tag suggestions only. It never writes to the setup — accepting a tag
 * is a separate action the user takes, through the existing update path.
 */
export async function POST(request: Request) {
  let body: { setupId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const loaded = await loadAIContext(body.setupId, "ai_auto_tagging");
  if (!loaded.ok) return loaded.response;

  const { userId, tier, setup } = loaded.context;
  const supabase = await createClient();
  const admin = getAdmin();

  const image = await loadScreenshot(setup.screenshot_path);

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

  const usage = await checkAIUsage(supabase, userId, tier, Boolean(image));
  if (!usage.allowed) {
    return NextResponse.json(
      { error: usage.reason, code: "usage_limit" },
      { status: 429 },
    );
  }

  try {
    // Claimed before the call, so a burst of concurrent requests sees
    // each other rather than all reading an empty window.
    const usageId = await reserveAIUsage(admin, userId, "ai_auto_tagging", Boolean(image));

    const provider = getAIProvider();
    const { data, model, mock, usage: tokens } = await provider.complete({
      intent: "auto_tagging",
      systemPrompt: AUTO_TAGGING_PROMPT,
      userContent: wrapUserContent(
        `${describeSetup(setup)}\n\n${
          image
            ? "A chart screenshot is attached."
            : "No chart screenshot is available; suggest tags only from the data above."
        }`,
      ),
      image: image ?? undefined,
      schema: suggestedTagsSchema,
      maxTokens: 800,
      // Under this route's own maxDuration of 60s, leaving room for
      // the database writes that follow.
      deadlineMs: 45_000,
    });

    await confirmAIUsage(admin, usageId, tokens, model);

    // Anything the setup already carries is not a suggestion.
    const existing = new Set(setup.tags.map((tag) => tag.toLowerCase()));
    const suggestions = data.tags.filter(
      (item) => !existing.has(item.tag.toLowerCase()),
    );

    return NextResponse.json({
      tags: suggestions,
      usedScreenshot: Boolean(image),
      mock: Boolean(mock),
    });
  } catch (error) {
    // No write here: the reservation above is already the failure
    // record, and deleting it would restore the bypass it closes.
    return aiErrorResponse(error);
  }
}
