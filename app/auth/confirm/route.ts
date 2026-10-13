import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { ROUTES, safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the links Supabase sends by email (signup confirmation, password
 * recovery, email change). The token hash is exchanged for a session here, on
 * the server, and then the user is sent on to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirectTarget(searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}${ROUTES.login}?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    return NextResponse.redirect(`${origin}${ROUTES.login}?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
