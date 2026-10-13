import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/**
 * Next.js 16 request proxy (formerly `middleware.ts`).
 *
 * Runs before every matched request: refreshes the Supabase session cookie and
 * redirects across the authenticated / unauthenticated boundary.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
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
