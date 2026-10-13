import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getPublicEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses Row Level Security, so it must only ever be
 * constructed inside a Route Handler or Server Action that has already
 * verified the caller's identity.
 *
 * The `server-only` import above makes the build fail if this module is ever
 * pulled into a client bundle.
 */
export function createAdminClient() {
  const { supabaseUrl } = getPublicEnv();

  return createSupabaseClient<Database>(supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
