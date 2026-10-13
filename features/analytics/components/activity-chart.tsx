import { Card } from "@/components/ui/card";
import type { Granularity, TimeBucket } from "@/features/analytics/utils/compute";

const GRANULARITY_LABEL: Record<Granularity, string> = {
  daily: "by day",
  weekly: "by week",
  monthly: "by month",
};

/**
 * Stacked bars, hand-drawn in SVG rather than pulled from a charting library.
 *
 * The chart needs four stacked values, a y-axis and a hover label — roughly
 * eighty lines — against the hundred-plus kilobytes a general-purpose library
 * would add to every page that imports it. It also inherits the design tokens
 * directly, so it matches the rest of the product instead of being themed to
 * approximate it.
 */
export function ActivityChart({
  buckets,
  granularity,
}: {
  buckets: TimeBucket[];
  granularity: Granularity;
}) {
  // Keep the most recent slice: past this the bars are thinner than the gaps.
  const visible = buckets.slice(-60);
  const max = Math.max(1, ...visible.map((bucket) => bucket.total));

  // A tick value that lands on a round number rather than the raw maximum.
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 60 ? 10 : 25;
  const ceiling = Math.ceil(max / step) * step;

  const segments = [
    { key: "wins", className: "fill-positive" },
    { key: "losses", className: "fill-negative" },
    { key: "breakeven", className: "fill-fg-subtle" },
    { key: "pending", className: "fill-border-strong" },
  ] as const;

  return (
    <Card glass className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-fg">Activity over time</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            Setups {GRANULARITY_LABEL[granularity]}, by outcome
          </p>
        </div>
        <p className="numeric text-xs text-fg-subtle">
          {visible.length} {visible.length === 1 ? "period" : "periods"}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-fg-subtle">
          No setups in this range.
        </p>
      ) : (
        <div className="mt-5 flex gap-3">
          <div className="flex shrink-0 flex-col justify-between py-0.5 text-right">
            <span className="numeric text-xs text-fg-subtle">{ceiling}</span>
            <span className="numeric text-xs text-fg-subtle">{ceiling / 2}</span>
            <span className="numeric text-xs text-fg-subtle">0</span>
          </div>

          <div className="min-w-0 flex-1">
            <svg
              viewBox={`0 0 ${visible.length * 10} 100`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`Setup activity ${GRANULARITY_LABEL[granularity]}`}
              className="h-40 w-full"
            >
              {[0, 50, 100].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2={visible.length * 10}
                  y1={y}
                  y2={y}
                  className="stroke-border"
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {visible.map((bucket, index) => {
                let offset = 0;
                return (
                  <g key={bucket.key}>
                    <title>
                      {`${bucket.label}: ${bucket.total} setups — ${bucket.wins}W ${bucket.losses}L ${bucket.breakeven}BE ${bucket.pending} open`}
                    </title>
                    {segments.map((segment) => {
                      const value = bucket[segment.key];
                      if (value === 0) return null;
                      const height = (value / ceiling) * 100;
                      const y = 100 - offset - height;
                      offset += height;
                      return (
                        <rect
                          key={segment.key}
                          x={index * 10 + 1.6}
                          y={y}
                          width={6.8}
                          height={height}
                          rx="0.8"
                          className={segment.className}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>

            <div className="mt-2 flex justify-between text-xs text-fg-subtle">
              <span>{visible[0].label}</span>
              {visible.length > 2 ? (
                <span className="hidden sm:inline">
                  {visible[Math.floor(visible.length / 2)].label}
                </span>
              ) : null}
              <span>{visible[visible.length - 1].label}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
