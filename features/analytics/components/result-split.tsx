import { Card } from "@/components/ui/card";
import { formatWinRate, type Stats } from "@/features/analytics/utils/compute";

const SEGMENTS = [
  { key: "wins", label: "Wins", className: "bg-positive" },
  { key: "losses", label: "Losses", className: "bg-negative" },
  { key: "breakeven", label: "Break even", className: "bg-fg-subtle" },
  { key: "pending", label: "No result", className: "bg-surface-hover" },
] as const;

/**
 * Share of outcomes as one bar. The headline figure above it is the win rate,
 * which uses a different denominator — wins over resolved setups only — so the
 * two are labelled distinctly rather than left to be conflated.
 */
export function ResultSplit({ stats }: { stats: Stats }) {
  const total = stats.total || 1;

  return (
    <Card glass className="p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-fg">Outcomes</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {stats.resolved === 0
              ? "No setups have resolved yet"
              : `Win rate counts ${stats.resolved} resolved ${stats.resolved === 1 ? "setup" : "setups"}`}
          </p>
        </div>
        <p className="stat text-2xl text-fg">{formatWinRate(stats.winRate)}</p>
      </div>

      <div
        className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-surface-hover"
        role="img"
        aria-label={`${stats.wins} wins, ${stats.losses} losses, ${stats.breakeven} break even, ${stats.pending} unresolved`}
      >
        {SEGMENTS.map((segment) => {
          const value = stats[segment.key];
          if (value === 0) return null;
          return (
            <span
              key={segment.key}
              className={segment.className}
              style={{ width: `${(value / total) * 100}%` }}
            />
          );
        })}
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs">
            <span
              className={`size-2 shrink-0 rounded-full ${segment.className}`}
              aria-hidden="true"
            />
            <span className="text-fg-muted">{segment.label}</span>
            <span className="numeric ml-auto text-fg">{stats[segment.key]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
