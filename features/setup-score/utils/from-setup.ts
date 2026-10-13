import type { SetupListItem } from "@/services/setups.service";
import type { ScoreInput } from "@/features/setup-score/types";
import type { AnalyticsRow } from "@/features/analytics/utils/compute";
import type { SetupRow } from "@/types/database";

/** Anything with the fields the score reads. Keeps one adapter for every shape. */
type Scorable = Pick<
  SetupRow,
  | "direction"
  | "ticker"
  | "market"
  | "traded_on"
  | "entry"
  | "stop_loss"
  | "take_profit"
  | "strategy"
  | "tags"
  | "screenshot_path"
  | "notes_length"
>;

export function toScoreInput(
  setup: Scorable | SetupListItem | AnalyticsRow,
): ScoreInput {
  const row = setup as Scorable;

  return {
    direction: row.direction,
    ticker: row.ticker,
    market: row.market,
    tradedOn: row.traded_on,
    entry: row.entry === null ? null : Number(row.entry),
    stopLoss: row.stop_loss === null ? null : Number(row.stop_loss),
    takeProfit: row.take_profit === null ? null : Number(row.take_profit),
    strategy: row.strategy,
    notesLength: row.notes_length ?? 0,
    hasScreenshot: Boolean(row.screenshot_path),
    tagCount: row.tags?.length ?? 0,
  };
}
