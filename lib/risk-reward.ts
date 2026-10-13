import type { TradeDirection } from "@/types/database";

export interface RiskRewardInput {
  direction: TradeDirection;
  entry: number;
  stopLoss: number;
  takeProfit: number;
}

export type RiskRewardProblem =
  | "incomplete"
  | "stop_wrong_side"
  | "target_wrong_side"
  | "zero_risk";

export type RiskRewardResult =
  | { ok: true; risk: number; reward: number; ratio: number }
  | { ok: false; problem: RiskRewardProblem };

const MAX_RATIO = 1000;

function isUsable(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Risk-to-reward, derived from the three levels.
 *
 *   Long:  risk = entry - stop,  reward = target - entry
 *   Short: risk = stop - entry,  reward = entry - target
 *
 * A stop or target on the wrong side of entry is a mistake worth surfacing,
 * not a negative ratio to display, so those cases return a named problem
 * instead of a number.
 */
export function calculateRiskReward({
  direction,
  entry,
  stopLoss,
  takeProfit,
}: Partial<RiskRewardInput>): RiskRewardResult {
  if (
    !direction ||
    !isUsable(entry) ||
    !isUsable(stopLoss) ||
    !isUsable(takeProfit)
  ) {
    return { ok: false, problem: "incomplete" };
  }

  const risk = direction === "long" ? entry - stopLoss : stopLoss - entry;
  const reward = direction === "long" ? takeProfit - entry : entry - takeProfit;

  if (risk === 0) return { ok: false, problem: "zero_risk" };
  if (risk < 0) return { ok: false, problem: "stop_wrong_side" };
  if (reward <= 0) return { ok: false, problem: "target_wrong_side" };

  const ratio = Math.min(reward / risk, MAX_RATIO);

  return { ok: true, risk, reward, ratio: Math.round(ratio * 100) / 100 };
}

export function formatRatio(ratio: number | null | undefined) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return null;
  }
  return `${ratio.toFixed(2)}R`;
}
