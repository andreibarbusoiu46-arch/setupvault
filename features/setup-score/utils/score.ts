import { calculateRiskReward } from "@/lib/risk-reward";
import {
  COMPONENT_LABELS,
  GRADES,
  MAX_SCORE,
  MIN_NOTE_LENGTH,
  RR_CURVE,
  SANE_RISK_PERCENT,
  WEIGHTS,
  type Grade,
  type ScoreComponent,
} from "@/features/setup-score/constants";
import type {
  ComponentScore,
  ScoreInput,
  SetupScore,
} from "@/features/setup-score/types";

/**
 * The Setup Quality Score.
 *
 * It measures how completely and coherently a setup was recorded — not whether
 * it made money, and not whether the entry was technically good. Without market
 * data the application cannot know where support sat or whether the stop was
 * behind liquidity, so it does not pretend to. Every point below comes from a
 * field the user filled in or a relationship the numbers themselves prove.
 */

function present(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Linear interpolation across the configured curve, clamped at both ends. */
function scoreRiskReward(ratio: number): number {
  const first = RR_CURVE[0];
  const last = RR_CURVE[RR_CURVE.length - 1];

  if (ratio <= first.ratio) return 0;
  if (ratio >= last.ratio) return last.points;

  for (let index = 1; index < RR_CURVE.length; index++) {
    const upper = RR_CURVE[index];
    const lower = RR_CURVE[index - 1];
    if (ratio <= upper.ratio) {
      const span = upper.ratio - lower.ratio;
      const progress = span === 0 ? 1 : (ratio - lower.ratio) / span;
      return lower.points + progress * (upper.points - lower.points);
    }
  }

  return last.points;
}

export function gradeFor(score: number): { grade: Grade; summary: string } {
  const match = GRADES.find((entry) => score >= entry.min) ?? GRADES[GRADES.length - 1];
  return { grade: match.grade, summary: match.summary };
}

export function calculateSetupScore(input: ScoreInput): SetupScore {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const points: Record<ScoreComponent, number> = {
    riskReward: 0,
    stopLoss: 0,
    takeProfit: 0,
    entry: 0,
    strategy: 0,
    documentation: 0,
  };

  const hasEntry = isNumber(input.entry);
  const hasStop = isNumber(input.stopLoss);
  const hasTarget = isNumber(input.takeProfit);
  const hasLevels = hasEntry && hasStop && hasTarget;

  const geometry =
    input.direction && hasLevels
      ? calculateRiskReward({
          direction: input.direction,
          entry: input.entry ?? undefined,
          stopLoss: input.stopLoss ?? undefined,
          takeProfit: input.takeProfit ?? undefined,
        })
      : null;

  const stopWrongSide =
    geometry !== null && !geometry.ok && geometry.problem === "stop_wrong_side";
  const targetWrongSide =
    geometry !== null && !geometry.ok && geometry.problem === "target_wrong_side";
  const zeroRisk =
    geometry !== null && !geometry.ok && geometry.problem === "zero_risk";

  /* --- A. Risk / reward ------------------------------------------------- */
  if (geometry?.ok) {
    points.riskReward = scoreRiskReward(geometry.ratio);
    if (geometry.ratio >= 2) {
      strengths.push(`Risk to reward of ${geometry.ratio.toFixed(2)}R`);
    } else if (geometry.ratio < 1) {
      improvements.push(
        `Risking more than the target pays (${geometry.ratio.toFixed(2)}R) — check the levels`,
      );
    } else {
      improvements.push(
        `Risk to reward is ${geometry.ratio.toFixed(2)}R; setups above 2R score higher`,
      );
    }
  } else if (!hasLevels) {
    improvements.push("Add entry, stop and target so a ratio can be worked out");
  }

  /* --- B. Stop loss ----------------------------------------------------- */
  if (!hasStop) {
    improvements.push("No stop loss recorded");
  } else if (stopWrongSide || zeroRisk) {
    improvements.push(
      zeroRisk
        ? "The stop sits exactly on the entry, so the trade has no defined risk"
        : `The stop is on the wrong side of the entry for a ${input.direction}`,
    );
  } else {
    points.stopLoss = 14;

    if (hasEntry && input.entry && input.stopLoss) {
      const riskPercent =
        (Math.abs(input.entry - input.stopLoss) / input.entry) * 100;

      if (
        riskPercent >= SANE_RISK_PERCENT.min &&
        riskPercent <= SANE_RISK_PERCENT.max
      ) {
        points.stopLoss += 6;
        strengths.push("Stop is placed a sensible distance from entry");
      } else {
        improvements.push(
          riskPercent < SANE_RISK_PERCENT.min
            ? "The stop is unusually tight relative to entry — check for a typo"
            : "The stop is unusually far from entry — check for a typo",
        );
      }
    }
  }

  /* --- C. Take profit --------------------------------------------------- */
  if (!hasTarget) {
    improvements.push("No take profit recorded");
  } else if (targetWrongSide) {
    improvements.push(
      `The target is on the wrong side of the entry for a ${input.direction}`,
    );
  } else {
    points.takeProfit = geometry?.ok ? 15 : 11;
  }

  /* --- D. Entry --------------------------------------------------------- */
  if (hasEntry) points.entry += 8;
  else improvements.push("No entry price recorded");

  if (input.direction) points.entry += 3;
  if (present(input.ticker)) points.entry += 3;
  else improvements.push("No ticker recorded");

  if (present(input.market)) points.entry += 3;
  if (present(input.tradedOn)) points.entry += 3;
  else improvements.push("No trade date recorded");

  /* --- E. Strategy and plan --------------------------------------------- */
  if (present(input.strategy)) {
    points.strategy += 7;
    strengths.push(`Strategy named: ${input.strategy?.trim()}`);
  } else {
    improvements.push("Name the strategy — it is what makes the setup findable");
  }

  if (hasLevels) {
    points.strategy += 5;
    strengths.push("All three execution levels recorded");
  }
  if (geometry?.ok) points.strategy += 3;

  /* --- F. Documentation ------------------------------------------------- */
  if (input.hasScreenshot) {
    points.documentation += 5;
    strengths.push("Chart screenshot attached");
  } else {
    improvements.push("Attach the chart you were looking at");
  }

  // A flat award above a floor: rewarding length would just encourage padding.
  if (input.notesLength >= MIN_NOTE_LENGTH) {
    points.documentation += 3;
    strengths.push("Setup has written notes");
  } else {
    improvements.push("Add a note on why you took it and what you would change");
  }

  if (input.tagCount > 0) points.documentation += 2;
  else improvements.push("Add a tag or two so this groups with similar setups");

  /* --- Total ------------------------------------------------------------ */
  const breakdown: ComponentScore[] = (
    Object.keys(WEIGHTS) as ScoreComponent[]
  ).map((component) => ({
    component,
    label: COMPONENT_LABELS[component],
    points: Math.round(Math.min(points[component], WEIGHTS[component])),
    max: WEIGHTS[component],
  }));

  const total = breakdown.reduce((sum, item) => sum + item.points, 0);
  const score = Math.max(0, Math.min(MAX_SCORE, Math.round(total)));
  const { grade, summary } = gradeFor(score);

  // Nothing logged beyond the required fields means there is nothing to judge.
  const scorable = hasEntry || hasStop || hasTarget;

  return {
    score,
    grade,
    summary,
    breakdown,
    strengths,
    improvements,
    hasGeometryError: stopWrongSide || targetWrongSide || zeroRisk,
    scorable,
  };
}
