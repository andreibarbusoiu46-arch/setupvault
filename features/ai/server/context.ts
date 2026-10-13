import "server-only";

import { NextResponse } from "next/server";

import { AIError } from "@/lib/ai";
import { canUseFeature, type AIFeature } from "@/lib/feature-access";
import { SCREENSHOT_BUCKET } from "@/features/setups/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { getSetupById } from "@/services/setups.service";
import type { ImagePayload } from "@/lib/ai/provider";
import type { SetupRow, SubscriptionTier } from "@/types/database";

/** Roughly 4 MB of base64. Larger images cost more and add nothing. */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export interface AIContext {
  userId: string;
  tier: SubscriptionTier;
  setup: SetupRow;
}

export type ContextResult =
  | { ok: true; context: AIContext }
  | { ok: false; response: NextResponse };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * The gate every AI route passes through.
 *
 * Identity comes from the session, the setup is read through the caller's own
 * RLS-scoped client so another user's id simply returns nothing, and the tier
 * is read from the profile row rather than from the request.
 */
export async function loadAIContext(
  setupId: unknown,
  feature: AIFeature,
): Promise<ContextResult> {
  if (typeof setupId !== "string" || setupId.length === 0) {
    return { ok: false, response: fail("No setup was specified.", 400) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, response: fail("You need to be signed in.", 401) };
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) {
    return { ok: false, response: fail("Your profile could not be read.", 404) };
  }

  if (!canUseFeature(profile.subscription_tier, feature)) {
    return {
      ok: false,
      response: fail("That feature is not part of your plan.", 403),
    };
  }

  // RLS means this returns null for a setup the user does not own, which is
  // indistinguishable from one that does not exist. That is the intent.
  const setup = await getSetupById(supabase, user.id, setupId);
  if (!setup) {
    return { ok: false, response: fail("That setup could not be found.", 404) };
  }

  return {
    ok: true,
    context: { userId: user.id, tier: profile.subscription_tier, setup },
  };
}

/**
 * Downloads a private screenshot server-side and returns it as base64.
 *
 * The object is never made public and no signed URL is handed to the provider;
 * the bytes are read through the user's own storage policies and forwarded
 * from the server.
 */
export async function loadScreenshot(
  path: string | null,
): Promise<ImagePayload | null> {
  if (!path) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .download(path);

  if (error || !data) return null;
  if (data.size > MAX_IMAGE_BYTES) return null;

  const mediaType =
    data.type === "image/png" || data.type === "image/webp"
      ? data.type
      : "image/jpeg";

  const buffer = Buffer.from(await data.arrayBuffer());

  return { mediaType, data: buffer.toString("base64") };
}

export function getAdmin() {
  return createAdminClient();
}

/** Maps a provider failure onto a message and status the user can act on. */
export function aiErrorResponse(error: unknown): NextResponse {
  if (error instanceof AIError) {
    const map: Record<string, { message: string; status: number }> = {
      not_configured: {
        message: "AI is not configured on this server yet.",
        status: 503,
      },
      unauthorized: {
        message: "The AI credentials were rejected. Check the server configuration.",
        status: 503,
      },
      rate_limited: {
        message: "The AI provider is busy. Try again in a minute.",
        status: 429,
      },
      timeout: {
        message: "The analysis took too long. Try again.",
        status: 504,
      },
      invalid_output: {
        message: "The analysis came back unreadable and was discarded. Try again.",
        status: 502,
      },
      image_unavailable: {
        message: "The screenshot could not be read.",
        status: 422,
      },
      provider_error: {
        message: "The AI provider could not be reached.",
        status: 502,
      },
    };

    const mapped = map[error.code] ?? map.provider_error;
    console.error("AI error", { code: error.code, message: error.message });
    return NextResponse.json(
      { error: mapped.message, code: error.code },
      { status: mapped.status },
    );
  }

  console.error("Unexpected AI failure", error);
  return NextResponse.json(
    { error: "Something went wrong. Try again in a moment." },
    { status: 500 },
  );
}

/** Serialises the setup for the model. Notes are content, never instruction. */
export function describeSetup(setup: SetupRow): string {
  const lines = [
    `Ticker: ${setup.ticker}`,
    `Market: ${setup.market}`,
    `Direction: ${setup.direction}`,
    `Date: ${setup.traded_on ?? "not recorded"}`,
    `Entry: ${setup.entry ?? "not recorded"}`,
    `Stop loss: ${setup.stop_loss ?? "not recorded"}`,
    `Take profit: ${setup.take_profit ?? "not recorded"}`,
    `Risk to reward: ${setup.risk_reward ?? "not recorded"}`,
    `Result: ${setup.result}`,
    `Strategy: ${setup.strategy ?? "not recorded"}`,
    `Tags: ${setup.tags.length > 0 ? setup.tags.join(", ") : "none"}`,
    `Title: ${setup.title}`,
    `Notes: ${setup.notes ?? "none"}`,
  ];

  return lines.join("\n");
}
