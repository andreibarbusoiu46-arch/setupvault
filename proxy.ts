import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 request proxy (formerly `middleware.ts`).
 *
 * Runs before every matched request: refreshes the Supabase session cookie and
 * redirects across the authenticated / unauthenticated boundary.
 *
 * TEMPORARY DIAGNOSTIC: the deployment returns a bare 500 on every matched
 * route, which hides the underlying error. Until that is identified, a failure
 * here is reported in a response header (names only, never values) and the
 * request is allowed through instead of taking the whole site down. Revert
 * once the cause is known.
 */
export default async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    const message = error instanceof Error ? error.message : String(error);
    const response = NextResponse.next({ request });
    response.headers.set(
      "x-sv-proxy-error",
      `${name}: ${message}`.slice(0, 300).replace(/[\r\n]+/g, " "),
    );
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Routes under /auth/*
     * are excluded so the email-link handlers can set cookies freely.
     */
    "/((?!_next/static|_next/image|auth/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
