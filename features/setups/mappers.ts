import type { SetupInput } from "@/services/setups.service";
import type { SetupRow } from "@/types/database";
import type { SetupFormValues } from "@/features/setups/schemas";

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/** Form values -> the columns the database expects. */
export function toSetupInput(values: SetupFormValues): SetupInput {
  return {
    title: values.title.trim(),
    ticker: values.ticker.trim().toUpperCase(),
    market: values.market,
    direction: values.direction,
    traded_on: emptyToNull(values.tradedOn),
    traded_at: values.tradedAt === "" ? null : `${values.tradedAt}:00`,
    entry: values.entry,
    stop_loss: values.stopLoss,
    take_profit: values.takeProfit,
    risk_reward: values.riskReward,
    result: values.result,
    strategy: emptyToNull(values.strategy),
    notes: emptyToNull(values.notes),
    tags: values.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    is_favorite: values.isFavorite,
  };
}

/** Database row -> form values, for the edit form. */
export function toFormValues(row: SetupRow): SetupFormValues {
  return {
    title: row.title,
    ticker: row.ticker,
    market: row.market,
    direction: row.direction,
    tradedOn: row.traded_on ?? "",
    // Postgres returns time as HH:MM:SS; the input needs HH:MM.
    tradedAt: row.traded_at ? row.traded_at.slice(0, 5) : "",
    entry: row.entry === null ? Number.NaN : Number(row.entry),
    stopLoss: row.stop_loss === null ? Number.NaN : Number(row.stop_loss),
    takeProfit: row.take_profit === null ? Number.NaN : Number(row.take_profit),
    riskReward: row.risk_reward === null ? null : Number(row.risk_reward),
    result: row.result,
    strategy: row.strategy ?? "",
    tags: row.tags ?? [],
    notes: row.notes ?? "",
    isFavorite: row.is_favorite,
  };
}
