import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Library } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { countAllSetups, fetchAnalyticsRows } from "@/services/analytics.service";
import { getFilterFacets } from "@/services/setups.service";
import { hasActiveFilters, parseFilters } from "@/features/setups/filters";
import { MARKET_LABELS } from "@/features/setups/constants";
import { SetupsToolbar } from "@/features/setups/components/setups-toolbar";
import {
  byDirection,
  byMarket,
  byStrategy,
  computeStats,
  favouritesSplit,
  formatRr,
  formatWinRate,
  pickGranularity,
  setupDate,
  timeSeries,
  withinLastDays,
} from "@/features/analytics/utils/compute";
import { ActivityChart } from "@/features/analytics/components/activity-chart";
import { BreakdownTable } from "@/features/analytics/components/breakdown-table";
import { ResultSplit } from "@/features/analytics/components/result-split";
import { TradingCalendar } from "@/features/analytics/components/trading-calendar";
import { ScoreVersusResult } from "@/features/analytics/components/score-versus-result";
import {
  scoreBands,
  scoreSummary,
} from "@/features/analytics/utils/score-analytics";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  // Same filter model as the library, so a range chosen there means the same
  // thing here.
  const filters = parseFilters(await searchParams);

  const [{ rows, truncated }, libraryTotal, facets] = await Promise.all([
    fetchAnalyticsRows(supabase, user.id, filters),
    countAllSetups(supabase, user.id),
    getFilterFacets(supabase, user.id),
  ]);

  if (libraryTotal === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Header />
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={BarChart3}
            title="Nothing to analyse yet"
            description="Your analytics will appear here once you start logging setups. A handful is enough to see the first patterns."
            action={
              <Button asChild>
                <Link href={`${ROUTES.setups}/new`}>Create your first setup</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const stats = computeStats(rows);
  const dates = rows.map(setupDate);
  const granularity = pickGranularity(dates);
  const buckets = timeSeries(rows, granularity);

  const today = new Date().toISOString().slice(0, 10);
  const last7 = computeStats(withinLastDays(rows, 7, today));
  const last30 = computeStats(withinLastDays(rows, 30, today));
  const favourites = favouritesSplit(rows);
  const scores = scoreSummary(rows);
  const bands = scoreBands(rows);

  const [currentYear, currentMonth] = today.split("-").map(Number);
  const filtered = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <SetupsToolbar
        filters={filters}
        facets={facets}
        pathname={ROUTES.analytics}
        showSort={false}
      />

      <p className="text-sm text-fg-muted" aria-live="polite">
        {filtered
          ? `Reading ${stats.total} of ${libraryTotal} setups.`
          : `Reading all ${libraryTotal} ${libraryTotal === 1 ? "setup" : "setups"}.`}
        {truncated ? " Capped at 20,000 rows." : ""}
      </p>

      {stats.total === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState
            icon={Library}
            title="No setups match these filters"
            description="Loosen a condition and the numbers will come back."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              label="Setups"
              value={String(stats.total)}
              note={`${stats.pending} still open`}
            />
            <MetricCard
              label="Win rate"
              value={formatWinRate(stats.winRate)}
              note={
                stats.resolved === 0
                  ? "Needs a resolved setup"
                  : `${stats.wins}W · ${stats.losses}L · ${stats.breakeven}BE`
              }
              tone={
                stats.winRate === null
                  ? "default"
                  : stats.winRate >= 50
                    ? "positive"
                    : "negative"
              }
            />
            <MetricCard
              label="Average R:R"
              value={formatRr(stats.avgRiskReward)}
              note="Across setups with a ratio"
              tone={stats.avgRiskReward === null ? "default" : "accent"}
            />
            <MetricCard
              label="Average score"
              value={scores.average === null ? "—" : String(scores.average)}
              note={
                scores.average === null
                  ? "Needs a setup with levels"
                  : `Best ${scores.best} · lowest ${scores.lowest}`
              }
              tone={scores.average === null ? "default" : "accent"}
            />
            <MetricCard
              label="Winners vs losers"
              value={
                stats.avgWinRiskReward === null && stats.avgLossRiskReward === null
                  ? "—"
                  : `${formatRr(stats.avgWinRiskReward)} / ${formatRr(stats.avgLossRiskReward)}`
              }
              note="Average R:R on wins, then on losses"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ActivityChart buckets={buckets} granularity={granularity} />
            <ResultSplit stats={stats} />
          </div>

          <ScoreVersusResult bands={bands} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card glass className="p-5">
              <h3 className="text-sm font-medium text-fg">Recent performance</h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                By trade date, not by when it was saved
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { label: "Last 7 days", data: last7 },
                  { label: "Last 30 days", data: last30 },
                ].map((window) => (
                  <div
                    key={window.label}
                    className="rounded-xl border border-border p-4"
                  >
                    <dt className="eyebrow">{window.label}</dt>
                    <dd className="stat mt-2 text-xl text-fg">
                      {window.data.total}
                    </dd>
                    <dd className="mt-1 text-xs text-fg-subtle">
                      {window.data.resolved === 0
                        ? "Nothing resolved"
                        : `Win rate ${formatWinRate(window.data.winRate)}`}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card glass className="p-5">
              <h3 className="text-sm font-medium text-fg">
                Favourites vs everything
              </h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                Are the setups you star actually your better ones?
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { label: "Favourites", data: favourites.favorites },
                  { label: "All setups", data: favourites.all },
                ].map((group) => (
                  <div
                    key={group.label}
                    className="rounded-xl border border-border p-4"
                  >
                    <dt className="eyebrow">{group.label}</dt>
                    <dd className="stat mt-2 text-xl text-fg">
                      {formatWinRate(group.data.winRate)}
                    </dd>
                    <dd className="mt-1 text-xs text-fg-subtle">
                      {group.data.total} setups · {formatRr(group.data.avgRiskReward)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>

          <TradingCalendar
            rows={rows}
            initialYear={currentYear}
            initialMonth={currentMonth}
            today={today}
          />

          <BreakdownTable
            title="Performance by strategy"
            description="Sorted by how often you take it"
            rows={byStrategy(rows)}
            emptyMessage="None of these setups have a strategy name yet."
          />

          <BreakdownTable
            title="Performance by market"
            description="Only the markets you actually trade"
            rows={byMarket(rows, MARKET_LABELS)}
            emptyMessage="No markets to compare yet."
          />

          <BreakdownTable
            title="Long versus short"
            rows={byDirection(rows)}
            emptyMessage="No directional data yet."
          />
        </>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 className="text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl">
        Analytics
      </h2>
      <p className="mt-2 text-sm text-fg-muted">
        Understand your setups. Find your patterns. Improve your execution.
      </p>
    </div>
  );
}
