import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import { AccountCard } from "@/features/settings/components/account-card";
import { AppearanceCard } from "@/features/settings/components/appearance-card";
import { NotificationsCard } from "@/features/settings/components/notifications-card";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const profile = await getProfile(supabase, user.id);
  if (!profile) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-fg">Settings</h2>
        <p className="mt-1.5 text-sm text-fg-muted">
          How SetupVault looks, what it emails you, and what happens to your
          account.
        </p>
      </div>

      <AppearanceCard userId={profile.id} preference={profile.theme} />

      <NotificationsCard
        userId={profile.id}
        initial={{
          email_notifications: profile.email_notifications,
          product_updates: profile.product_updates,
        }}
      />

      <AccountCard email={profile.email} />
    </div>
  );
}
