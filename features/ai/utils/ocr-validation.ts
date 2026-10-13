import type { OcrLevels } from "@/features/ai/schemas";
import type { TradeDirection } from "@/types/database";

export interface OcrReview {
  usable: boolean;
  reason: string | null;
}

/**
 * Extracted levels are checked against the direction before they are ever
 * offered to the user. A model reading a chart can easily swap a stop for a
 * target, and the geometry is the one thing we can verify without the chart.
 *
 * Nothing here writes to the setup — it only decides whether the suggestion is
 * coherent enough to show.
 */
export function reviewOcrLevels(
  levels: OcrLevels,
  direction: TradeDirection,
): OcrReview {
  const { entry, stopLoss, takeProfit } = levels;

  if (levels.ambiguous) {
    return {
      usable: false,
      reason: "The model could see prices but not tell which level each one was.",
    };
  }

  if (entry === null) {
    return { usable: false, reason: "No entry price could be read." };
  }

  const finite = [entry, stopLoss, takeProfit].every(
    (value) => value === null || (Number.isFinite(value) && value > 0),
  );
  if (!finite) {
    return { usable: false, reason: "The values read were not valid prices." };
  }

  if (direction === "long") {
    if (stopLoss !== null && stopLoss >= entry) {
      return {
        usable: false,
        reason: "On a long the stop must sit below the entry; the reading does not.",
      };
    }
    if (takeProfit !== null && takeProfit <= entry) {
      return {
        usable: false,
        reason: "On a long the target must sit above the entry; the reading does not.",
      };
    }
  } else {
    if (stopLoss !== null && stopLoss <= entry) {
      return {
        usable: false,
        reason: "On a short the stop must sit above the entry; the reading does not.",
      };
    }
    if (takeProfit !== null && takeProfit >= entry) {
      return {
        usable: false,
        reason: "On a short the target must sit below the entry; the reading does not.",
      };
    }
  }

  return { usable: true, reason: null };
}
