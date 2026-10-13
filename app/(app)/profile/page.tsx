import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ProfileSummary } from "@/features/profile/components/profile-summary";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const profile = await getProfile(supabase, user.id);
  if (!profile) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-fg">Profile</h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          Your account details and how you appear inside SetupVault.
        </p>
      </div>

      <ProfileSummary
        profile={profile}
        lastSignInAt={user.last_sign_in_at ?? null}
      />

      <ProfileForm profile={profile} />
    </div>
  );
}
