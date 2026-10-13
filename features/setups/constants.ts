import type {
  MarketType,
  TradeDirection,
  TradeResult,
} from "@/types/database";

export const MARKET_OPTIONS: { value: MarketType; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "stocks", label: "Stocks" },
  { value: "indices", label: "Indices" },
  { value: "futures", label: "Futures" },
  { value: "commodities", label: "Commodities" },
  { value: "options", label: "Options" },
];

export const DIRECTION_OPTIONS: { value: TradeDirection; label: string }[] = [
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
];

/** `pending` is what the product calls "No result" — the trade is unresolved. */
export const RESULT_OPTIONS: { value: TradeResult; label: string }[] = [
  { value: "pending", label: "No result" },
  { value: "win", label: "Win" },
  { value: "loss", label: "Loss" },
  { value: "breakeven", label: "Break even" },
];

export const MARKET_LABELS = Object.fromEntries(
  MARKET_OPTIONS.map((option) => [option.value, option.label]),
) as Record<MarketType, string>;

export const RESULT_LABELS = Object.fromEntries(
  RESULT_OPTIONS.map((option) => [option.value, option.label]),
) as Record<TradeResult, string>;

export const RESULT_BADGE = {
  win: "positive",
  loss: "negative",
  breakeven: "neutral",
  pending: "neutral",
} as const;

export const SCREENSHOT_BUCKET = "setup-screenshots";
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
