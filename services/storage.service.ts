import type { SupabaseClient } from "@supabase/supabase-js";

import { SCREENSHOT_BUCKET } from "@/features/setups/constants";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Signed URLs are short-lived; the bucket itself is private. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/**
 * Uploads a screenshot to <user_id>/<setup_id>/<timestamp>.<ext>.
 *
 * The first path segment is what the storage policy compares against
 * auth.uid(), so a client cannot write into another user's folder even if it
 * asks to. The filename is generated here rather than taken from the file, so
 * a hostile name cannot traverse the path.
 */
export async function uploadScreenshot(
  supabase: Client,
  { userId, setupId, file }: { userId: string; setupId: string; file: File },
): Promise<string> {
  const path = `${userId}/${setupId}/${Date.now()}.${extensionFor(file.type)}`;

  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
  return path;
}

/** Best-effort cleanup. A failed removal must not fail the user's action. */
export async function removeScreenshot(supabase: Client, path: string) {
  const { error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Screenshot cleanup failed", { path, error });
  }
}

/** Removes every object under a setup's folder. Used when a setup is deleted. */
export async function removeSetupFolder(
  supabase: Client,
  { userId, setupId }: { userId: string; setupId: string },
) {
  const prefix = `${userId}/${setupId}`;
  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .list(prefix);

  if (error || !data || data.length === 0) return;

  await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .remove(data.map((item) => `${prefix}/${item.name}`));
}

export async function createScreenshotUrl(
  supabase: Client,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Batch version for list views — one request instead of one per card.
 * Returns a path -> signed URL map; paths that fail simply stay absent.
 */
export async function createScreenshotUrls(
  supabase: Client,
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  data.forEach((item) => {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  });
  return map;
}
