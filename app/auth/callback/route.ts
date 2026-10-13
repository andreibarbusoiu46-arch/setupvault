import { NextResponse, type NextRequest } from "next/server";

import { ROUTES, safeRedirectTarget } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * PKCE callback. Used when Supabase returns an authorisation `code` rather than
 * a token hash — the default for OAuth providers and for projects configured
 * with the PKCE email flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const next = safeRedirectTarget(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}${ROUTES.login}?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}${ROUTES.login}?error=expired_link`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
