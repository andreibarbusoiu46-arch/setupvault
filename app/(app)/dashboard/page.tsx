import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  getSetupStats,
  listFavoriteSetups,
  listRecentSetups,
} from "@/services/setups.service";
import { getProfile } from "@/services/profile.service";
import { fetchAnalyticsRows } from "@/services/analytics.service";
import { DEFAULT_FILTERS } from "@/features/setups/filters";
import { RecentForm } from "@/features/dashboard/components/recent-form";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { Panel } from "@/features/dashboard/components/panel";
import { SetupList } from "@/features/dashboard/components/setup-list";
import { StatsGrid } from "@/features/dashboard/components/stats-grid";
import { Welcome } from "@/features/dashboard/components/welcome";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, stats, recent, favorites, recentWindow] = await Promise.all([
    getProfile(supabase, user.id),
    getSetupStats(supabase, user.id),
    listRecentSetups(supabase, user.id),
    listFavoriteSetups(supabase, user.id),
    // Bounded to 30 days: the dashboard never reads the whole library.
    fetchAnalyticsRows(supabase, user.id, { ...DEFAULT_FILTERS, range: "30d" }),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-7">
      <Welcome name={firstName} />

      <StatsGrid stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent setups"
          description="The last five setups you saved"
          action={
            stats.total > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.setups}>View all</Link>
              </Button>
            ) : null
          }
        >
          <SetupList
            setups={recent}
            emptyTitle="No setups yet"
            emptyDescription="Your saved setups will appear here, newest first."
            emptyAction={
              <Button asChild size="sm">
                <Link href={`${ROUTES.setups}/new`}>Save your first setup</Link>
              </Button>
            }
          />
        </Panel>

        <Panel
          title="Favourites"
          description="Setups you starred for review"
          action={
            stats.favorites > 0 ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.favorites}>View all</Link>
              </Button>
            ) : null
          }
        >
          <SetupList
            setups={favorites}
            emptyIcon={Star}
            emptyTitle="No favourites yet"
            emptyDescription="Star the setups worth studying again and they will stay one click away."
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Activity" description="What has changed in your vault">
          <ActivityFeed setups={recent} />
        </Panel>

        <RecentForm rows={recentWindow.rows} />
      </div>
    </div>
  );
}
