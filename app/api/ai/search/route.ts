import { NextResponse } from "next/server";

import { getAIProvider } from "@/lib/ai";
import { SEMANTIC_SEARCH_PROMPT, wrapUserContent } from "@/lib/ai/prompts";
import { canUseFeature } from "@/lib/feature-access";
import { semanticQuerySchema } from "@/features/ai/schemas";
import {
  semanticQueryToFilters,
  semanticQueryToHref,
} from "@/features/ai/utils/to-filters";
import { aiErrorResponse, getAdmin } from "@/features/ai/server/context";
import { checkAIUsage, recordAIUsage } from "@/services/ai-usage.service";
import { getProfile } from "@/services/profile.service";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * Turns a plain-language request into filters for the user's own vault.
 *
 * The model never runs a query. It returns a structured object, that object is
 * validated, and the result is handed to the same filter layer the normal
 * search UI uses.
 */
export async function POST(request: Request) {
  let body: { query?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const text = typeof body.query === "string" ? body.query.trim() : "";
  if (!text || text.length > 400) {
    return NextResponse.json(
      { error: "Type what you are looking for, in a sentence or two." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to be signed in." }, { status: 401 });
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return NextResponse.json({ error: "Your profile could not be read." }, { status: 404 });
  }

  if (!canUseFeature(profile.subscription_tier, "semantic_search")) {
    return NextResponse.json(
      { error: "Semantic search is not part of your plan.", code: "locked" },
      { status: 403 },
    );
  }

  const usage = await checkAIUsage(supabase, user.id, profile.subscription_tier, false);
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason, code: "usage_limit" }, { status: 429 });
  }

  try {
    const provider = getAIProvider();
    const { data, mock } = await provider.complete({
      intent: "semantic_search",
      systemPrompt: SEMANTIC_SEARCH_PROMPT,
      userContent: wrapUserContent(
        `Today is ${new Date().toISOString().slice(0, 10)}.\nRequest: ${text}`,
      ),
      schema: semanticQuerySchema,
      maxTokens: 600,
    });

    await recordAIUsage(getAdmin(), user.id, "semantic_search", false);

    return NextResponse.json({
      filters: semanticQueryToFilters(data),
      href: semanticQueryToHref(data),
      intent: data.semanticIntent,
      mock: Boolean(mock),
    });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
