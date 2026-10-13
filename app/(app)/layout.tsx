import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SetupRequired } from "@/components/layout/setup-required";
import { ThemeSync } from "@/components/providers/theme-sync";
import { requireUser } from "@/lib/auth";
import { planLabel } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/services/profile.service";
import type { ProfileRow } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware redirects unauthenticated requests; this is the check that
  // actually guards the data behind the layout.
  const user = await requireUser();
  const supabase = await createClient();

  let profile: ProfileRow | null = null;
  try {
    profile = await getProfile(supabase, user.id);
  } catch {
    return (
      <SetupRequired detail="Your account is signed in, but the profiles table could not be read." />
    );
  }

  if (!profile) {
    return (
      <SetupRequired detail="Your account is signed in, but it has no profile row. This happens when the schema was created after the account." />
    );
  }

  const plan = planLabel(profile.subscription_tier);

  return (
    <div className="min-h-dvh bg-canvas">
      <ThemeSync preference={profile.theme} />
      <Sidebar planLabel={plan} />

      <div className="lg:pl-64">
        <Topbar
          name={profile.full_name}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          planLabel={plan}
        />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
