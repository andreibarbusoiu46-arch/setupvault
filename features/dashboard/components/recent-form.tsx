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
export function RecentForm({ rows }: { rows: AnalyticsRow[] }) {
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
        <p className="py-6 text-sm text-fg-subtle">
          Nothing logged in the last 30 days.
        </p>
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
