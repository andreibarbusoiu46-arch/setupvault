import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";

/** Returns the verified user for the current request, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Server-side authorisation gate. Middleware already redirects unauthenticated
 * requests; this is the check that actually protects the data, and it runs in
 * every protected layout.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(ROUTES.login);
  return user;
}
