/**
 * Every threshold, weight and grade boundary lives here. The engine reads them
 * and nothing else hardcodes a number, so the model can be retuned in one file
 * without touching the calculation.
 */

export const WEIGHTS = {
  riskReward: 20,
  stopLoss: 20,
  takeProfit: 15,
  entry: 20,
  strategy: 15,
  documentation: 10,
} as const;

export type ScoreComponent = keyof typeof WEIGHTS;

export const COMPONENT_LABELS: Record<ScoreComponent, string> = {
  riskReward: "Risk / reward",
  stopLoss: "Stop loss",
  takeProfit: "Take profit",
  entry: "Entry",
  strategy: "Strategy",
  documentation: "Documentation",
};

export const MAX_SCORE = Object.values(WEIGHTS).reduce(
  (sum, weight) => sum + weight,
  0,
);

/**
 * Risk-to-reward curve. Points are interpolated between these stops rather
 * than assigned in bands, so a setup at 1.99R does not score dramatically
 * worse than one at 2.00R.
 */
export const RR_CURVE: { ratio: number; points: number }[] = [
  { ratio: 0.5, points: 0 },
  { ratio: 1.0, points: 6 },
  { ratio: 1.5, points: 10 },
  { ratio: 2.0, points: 14 },
  { ratio: 3.0, points: 18 },
  { ratio: 5.0, points: 20 },
];

/** Risk outside this band of the entry price usually means a typo, not a plan. */
export const SANE_RISK_PERCENT = { min: 0.05, max: 15 } as const;

/** Notes shorter than this are treated as absent. Length is a floor, not a score. */
export const MIN_NOTE_LENGTH = 20;

export const GRADES = [
  { min: 90, grade: "A+", summary: "Complete, well-structured setup" },
  { min: 80, grade: "A", summary: "Strong setup structure" },
  { min: 70, grade: "B", summary: "Solid, with room to tighten" },
  { min: 60, grade: "C", summary: "Workable but incomplete" },
  { min: 50, grade: "D", summary: "Missing several fundamentals" },
  { min: 0, grade: "F", summary: "Not enough recorded to judge" },
] as const;

export type Grade = (typeof GRADES)[number]["grade"];

/** Buckets used by the score-versus-result comparison in analytics. */
export const SCORE_BANDS = {
  high: 80,
  low: 60,
} as const;

/** Below this many setups per band, the comparison is noise. */
export const MIN_BAND_SAMPLE = 5;
