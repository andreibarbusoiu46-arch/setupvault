import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";
import {
  byStrategy,
  computeStats,
  formatRr,
  formatWinRate,
  type AnalyticsRow,
} from "@/features/analytics/utils/compute";

/**
 * A bounded read of the last 30 days, not the whole library: the dashboard is
 * an overview, and the window is stated in the heading so the numbers cannot be
 * mistaken for lifetime figures. The full picture lives on Analytics.
 */
export function RecentForm({
  rows,
  libraryTotal,
}: {
  rows: AnalyticsRow[];
  /**
   * Everything the user owns, ignoring the window.
   *
   * Without this the panel cannot tell "you have not traded this month" from
   * "you have three years of history, all of it older than this window" — and
   * it said the first while meaning the second. After importing a year of
   * trades that reads as the import having failed, which is exactly the
   * conclusion it produced.
   */
  libraryTotal: number;
}) {
  const stats = computeStats(rows);
  const strategies = byStrategy(rows);

  // "Most used" rather than "best": ranking by win rate over a 30-day window
  // would crown whichever strategy happened to hit twice.
  const top = strategies[0] ?? null;

  return (
    <Card glass className="flex flex-col p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-fg">Last 30 days</h3>
          <p className="mt-0.5 text-xs text-fg-muted">By trade date</p>
        </div>
        <Link
          href={ROUTES.analytics}
          className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
        >
          Analytics
        </Link>
      </div>

      {stats.total === 0 ? (
        <div className="py-6">
          <p className="text-sm text-fg-subtle">
            Nothing logged in the last 30 days.
          </p>
          {libraryTotal > 0 ? (
            <p className="mt-2 text-sm text-fg-muted">
              Your {libraryTotal === 1 ? "setup is" : `${libraryTotal} setups are`}{" "}
              dated outside this window —{" "}
              <Link
                href={ROUTES.analytics}
                className="text-fg underline underline-offset-4"
              >
                see them on Analytics
              </Link>
              .
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-3">
            <div>
              <dt className="eyebrow">Setups</dt>
              <dd className="stat mt-1.5 text-xl text-fg">{stats.total}</dd>
            </div>
            <div>
              <dt className="eyebrow">Win rate</dt>
              <dd className="stat mt-1.5 text-xl text-fg">
                {formatWinRate(stats.winRate)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Avg R:R</dt>
              <dd className="stat mt-1.5 text-xl text-fg">
                {formatRr(stats.avgRiskReward)}
              </dd>
            </div>
          </dl>

          {stats.netPnl !== null ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="eyebrow">Net P&amp;L</p>
              <p
                className={
                  stats.netPnl > 0
                    ? "stat mt-1.5 text-xl text-positive"
                    : stats.netPnl < 0
                      ? "stat mt-1.5 text-xl text-negative"
                      : "stat mt-1.5 text-xl text-fg"
                }
              >
                {stats.netPnl > 0 ? "+" : ""}
                {stats.netPnl.toLocaleString("en-GB", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              {/* The count travels with the figure. A currency total over a
                  set where only some rows carry one is not the user's P&L,
                  it is the P&L of part of their library. */}
              <p className="mt-1 text-xs text-fg-subtle">
                from {stats.pnlRows} of {stats.total}{" "}
                {stats.total === 1 ? "setup" : "setups"} with a recorded figure
              </p>
            </div>
          ) : null}

          {top ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="eyebrow">Most used strategy</p>
              <p className="mt-1.5 truncate text-sm text-fg">{top.label}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                {top.total} {top.total === 1 ? "setup" : "setups"}
                {top.resolved > 0
                  ? ` · win rate ${formatWinRate(top.winRate)}`
                  : " · nothing resolved yet"}
              </p>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
