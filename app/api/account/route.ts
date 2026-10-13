import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Permanently deletes the signed-in user's account.
 *
 * Deleting an auth user requires the service role key, which must never reach
 * the browser — so this runs server-side and derives the target user from the
 * verified session rather than from anything the client sends. Every row the
 * user owns is removed by the `on delete cascade` foreign keys in the schema.
 */
export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You need to be signed in to delete your account." },
      { status: 401 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        error:
          "Account deletion is not configured on this server. Contact support.",
      },
      { status: 503 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("Account deletion failed", { userId: user.id, error });
    return NextResponse.json(
      { error: "Your account could not be deleted. Try again in a moment." },
      { status: 500 },
    );
  }

  // Clear the session cookies for this browser.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
