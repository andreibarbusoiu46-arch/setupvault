import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ProfileRow, ThemePreference } from "@/types/database";

type Client = SupabaseClient<Database>;

export interface ProfileUpdate {
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export interface PreferencesUpdate {
  theme?: ThemePreference;
  email_notifications?: boolean;
  product_updates?: boolean;
}

/**
 * All profile access goes through here so the query shape lives in one place.
 * Every call is still filtered by Row Level Security on the server.
 */
export async function getProfile(
  supabase: Client,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: Client,
  userId: string,
  values: ProfileUpdate,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updatePreferences(
  supabase: Client,
  userId: string,
  values: PreferencesUpdate,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
