import { computeStats, type AnalyticsRow, type Stats } from "@/features/analytics/utils/compute";
import { scoreOf } from "@/features/analytics/utils/score-analytics";

/**
 * Historical observations about the user's own setups.
 *
 * All of it is deterministic arithmetic over rows already in the database. No
 * model is involved in producing a number here — sending a trading history to
 * a language model to have it count wins would be slower, dearer and less
 * accurate than counting them.
 */

export type SampleQuality = "insufficient" | "limited" | "meaningful";

export const SAMPLE_THRESHOLDS = { limited: 10, meaningful: 20 } as const;

export function sampleQuality(resolved: number): SampleQuality {
  if (resolved < SAMPLE_THRESHOLDS.limited) return "insufficient";
  if (resolved < SAMPLE_THRESHOLDS.meaningful) return "limited";
  return "meaningful";
}

export const SAMPLE_LABELS: Record<SampleQuality, string> = {
  insufficient: "Too few to read anything into",
  limited: "Limited sample",
  meaningful: "Historical observation",
};

export interface Insight {
  key: string;
  label: string;
  stats: Stats;
  averageScore: number | null;
  quality: SampleQuality;
}

function buildInsight(key: string, label: string, rows: AnalyticsRow[]): Insight {
  const stats = computeStats(rows);
  const scores = rows
    .map(scoreOf)
    .filter((score): score is number => score !== null);

  return {
    key,
    label,
    stats,
    averageScore:
      scores.length === 0
        ? null
        : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    quality: sampleQuality(stats.resolved),
  };
}

function group(
  rows: AnalyticsRow[],
  keysOf: (row: AnalyticsRow) => { key: string; label: string }[],
): Insight[] {
  const buckets = new Map<string, { label: string; rows: AnalyticsRow[] }>();

  for (const row of rows) {
    for (const identity of keysOf(row)) {
      const existing = buckets.get(identity.key);
      if (existing) existing.rows.push(row);
      else buckets.set(identity.key, { label: identity.label, rows: [row] });
    }
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => buildInsight(key, bucket.label, bucket.rows))
    .sort((a, b) => b.stats.resolved - a.stats.resolved);
}

/** A setup can carry several tags, so it contributes to several buckets. */
export function getPerformanceByTag(rows: AnalyticsRow[]): Insight[] {
  return group(rows, (row) =>
    (row.tags ?? []).map((tag) => ({ key: `tag:${tag}`, label: tag })),
  );
}

export function getPerformanceByStrategy(rows: AnalyticsRow[]): Insight[] {
  return group(rows, (row) =>
    row.strategy ? [{ key: `strategy:${row.strategy}`, label: row.strategy }] : [],
  );
}

export function getPerformanceByMarket(rows: AnalyticsRow[]): Insight[] {
  return group(rows, (row) => [{ key: `market:${row.market}`, label: row.market }]);
}

export function getPerformanceByDirection(rows: AnalyticsRow[]): Insight[] {
  return group(rows, (row) => [
    {
      key: `direction:${row.direction}`,
      label: row.direction === "long" ? "Long" : "Short",
    },
  ]);
}

/**
 * The gap in setup score between winning and losing trades — descriptive only.
 * Returns null unless both sides carry enough setups to be worth stating.
 */
export function scoreGapBetweenOutcomes(rows: AnalyticsRow[]): {
  winners: number;
  losers: number;
  gap: number;
} | null {
  const average = (subset: AnalyticsRow[]) => {
    const scores = subset
      .map(scoreOf)
      .filter((score): score is number => score !== null);
    if (scores.length === 0) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const winRows = rows.filter((row) => row.result === "win");
  const lossRows = rows.filter((row) => row.result === "loss");

  if (
    winRows.length < SAMPLE_THRESHOLDS.limited ||
    lossRows.length < SAMPLE_THRESHOLDS.limited
  ) {
    return null;
  }

  const winners = average(winRows);
  const losers = average(lossRows);
  if (winners === null || losers === null) return null;

  return {
    winners: Math.round(winners),
    losers: Math.round(losers),
    gap: Math.round(winners - losers),
  };
}

/** Insights worth surfacing: enough data, and sorted by sample size. */
export function topInsights(rows: AnalyticsRow[], limit = 5): Insight[] {
  return [
    ...getPerformanceByTag(rows),
    ...getPerformanceByStrategy(rows),
  ]
    .filter((insight) => insight.quality !== "insufficient")
    .sort((a, b) => b.stats.resolved - a.stats.resolved)
    .slice(0, limit);
}
