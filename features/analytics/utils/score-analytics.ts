import {
  MIN_BAND_SAMPLE,
  SCORE_BANDS,
} from "@/features/setup-score/constants";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { toScoreInput } from "@/features/setup-score/utils/from-setup";
import {
  computeStats,
  type AnalyticsRow,
  type Stats,
} from "@/features/analytics/utils/compute";

export interface ScoreSummary {
  average: number | null;
  best: number | null;
  lowest: number | null;
  scored: number;
}

export interface ScoreBand {
  key: "high" | "middle" | "low";
  label: string;
  stats: Stats;
  /** False when the band holds too few setups to read anything into. */
  meaningful: boolean;
}

export function scoreOf(row: AnalyticsRow): number | null {
  const result = calculateSetupScore(toScoreInput(row));
  return result.scorable ? result.score : null;
}

export function scoreSummary(rows: AnalyticsRow[]): ScoreSummary {
  const scores = rows
    .map(scoreOf)
    .filter((score): score is number => score !== null);

  if (scores.length === 0) {
    return { average: null, best: null, lowest: null, scored: 0 };
  }

  const total = scores.reduce((sum, score) => sum + score, 0);

  return {
    average: Math.round(total / scores.length),
    best: Math.max(...scores),
    lowest: Math.min(...scores),
    scored: scores.length,
  };
}

/**
 * Groups setups by score band and reports the win rate observed in each.
 *
 * This is an observation about rows the user logged, not evidence that a high
 * score causes a win — the bands are flagged as unusable below a small sample
 * so the UI can say so rather than implying a finding.
 */
export function scoreBands(rows: AnalyticsRow[]): ScoreBand[] {
  const high: AnalyticsRow[] = [];
  const middle: AnalyticsRow[] = [];
  const low: AnalyticsRow[] = [];

  for (const row of rows) {
    const score = scoreOf(row);
    if (score === null) continue;

    if (score >= SCORE_BANDS.high) high.push(row);
    else if (score >= SCORE_BANDS.low) middle.push(row);
    else low.push(row);
  }

  return [
    { key: "high" as const, label: `${SCORE_BANDS.high}+`, rows: high },
    {
      key: "middle" as const,
      label: `${SCORE_BANDS.low}–${SCORE_BANDS.high - 1}`,
      rows: middle,
    },
    { key: "low" as const, label: `Below ${SCORE_BANDS.low}`, rows: low },
  ].map((band) => ({
    key: band.key,
    label: band.label,
    stats: computeStats(band.rows),
    meaningful: band.rows.length >= MIN_BAND_SAMPLE,
  }));
}

/** Average score for an arbitrary subset, used by the group breakdowns. */
export function averageScore(rows: AnalyticsRow[]): number | null {
  return scoreSummary(rows).average;
}
