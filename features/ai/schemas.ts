import { z } from "zod";

/**
 * Model output is untrusted external data. Nothing reaches the database or the
 * screen before it parses cleanly here.
 */

const confidence = z
  .number()
  .min(0, { error: "Confidence below 0." })
  .max(1, { error: "Confidence above 1." });

/** "unclear" is a first-class answer — it is what the model must return when
 *  the information genuinely is not there, instead of guessing. */
export const ASSESSMENT_VALUES = ["good", "acceptable", "weak", "unclear"] as const;
export const LIKELIHOOD_VALUES = ["likely", "possible", "unclear", "absent"] as const;

const shortText = z.string().trim().min(1).max(600);
const bullet = z.string().trim().min(1).max(300);

export const assessmentSchema = z.object({
  assessment: z.enum(ASSESSMENT_VALUES),
  explanation: shortText,
  confidence,
});

export const observationSchema = z.object({
  status: z.enum(LIKELIHOOD_VALUES),
  explanation: shortText,
  confidence,
});

export const detectedPatternSchema = z.object({
  name: z.string().trim().min(1).max(60),
  status: z.enum(LIKELIHOOD_VALUES),
  confidence,
});

export const setupAnalysisSchema = z.object({
  overallAssessment: shortText,
  entryQuality: assessmentSchema,
  stopLossQuality: assessmentSchema,
  takeProfitQuality: assessmentSchema,
  riskRewardAssessment: assessmentSchema,
  marketStructure: observationSchema,
  liquidityAnalysis: observationSchema,
  supportResistance: observationSchema,
  confluences: z.array(bullet).max(8),
  strengths: z.array(bullet).max(8),
  weaknesses: z.array(bullet).max(8),
  improvementSuggestions: z.array(bullet).max(8),
  /** What the model could not determine. Required, so it cannot quietly skip it. */
  uncertainty: z.array(bullet).max(8),
  detectedPatterns: z.array(detectedPatternSchema).max(12),
  confidence,
});

export type SetupAnalysis = z.infer<typeof setupAnalysisSchema>;

/* -------------------------------------------------------------------------- */

export const suggestedTagSchema = z.object({
  tag: z
    .string()
    .trim()
    .min(1)
    .max(30)
    .regex(/^[a-z0-9][a-z0-9 \-]*$/i, { error: "Unsupported characters in tag." }),
  confidence,
  rationale: z.string().trim().max(200).optional(),
});

export const suggestedTagsSchema = z.object({
  tags: z.array(suggestedTagSchema).max(12),
});

export type SuggestedTag = z.infer<typeof suggestedTagSchema>;

/* -------------------------------------------------------------------------- */

const priceLevel = z
  .number()
  .finite()
  .positive()
  .max(100_000_000)
  .nullable();

export const ocrLevelsSchema = z.object({
  entry: priceLevel,
  stopLoss: priceLevel,
  takeProfit: priceLevel,
  confidence,
  /** Set when the model could see numbers but not tell which level they were. */
  ambiguous: z.boolean(),
  note: z.string().trim().max(300).optional(),
});

export type OcrLevels = z.infer<typeof ocrLevelsSchema>;

/* -------------------------------------------------------------------------- */

/**
 * The only shape a natural-language query may take. The model produces this
 * object and nothing else — it never writes a query, and no string it returns
 * is ever concatenated into SQL.
 */
export const semanticQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  direction: z.enum(["all", "long", "short"]).default("all"),
  result: z.enum(["all", "win", "loss", "breakeven", "pending"]).default("all"),
  market: z.string().trim().max(40).default("all"),
  strategy: z.string().trim().max(120).default("all"),
  favorites: z.enum(["all", "only"]).default("all"),
  range: z
    .enum(["all", "today", "7d", "30d", "90d", "year", "custom"])
    .default("all"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  rr: z.enum(["all", "1", "1.5", "2", "3"]).default("all"),
  tags: z.array(z.string().trim().min(1).max(30)).max(6).default([]),
  /** Free-text intent the structured fields cannot express. Displayed, never executed. */
  semanticIntent: z.string().trim().max(200).default(""),
});

export type SemanticQuery = z.infer<typeof semanticQuerySchema>;

export const scoreExplanationSchema = z.object({
  summary: shortText,
  strongest: z.array(bullet).max(4),
  weakest: z.array(bullet).max(4),
});

export type ScoreExplanation = z.infer<typeof scoreExplanationSchema>;
