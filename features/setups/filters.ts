import { z } from "zod";

import type { MarketType, TradeDirection, TradeResult } from "@/types/database";

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "rr_desc", label: "Highest R:R" },
  { value: "rr_asc", label: "Lowest R:R" },
  { value: "entry_desc", label: "Highest entry" },
  { value: "entry_asc", label: "Lowest entry" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export const DATE_RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
] as const;

export type DateRangeKey = (typeof DATE_RANGE_OPTIONS)[number]["value"];

export const RR_OPTIONS = [
  { value: "all", label: "Any R:R" },
  { value: "1", label: "1R or better" },
  { value: "1.5", label: "1.5R or better" },
  { value: "2", label: "2R or better" },
  { value: "3", label: "3R or better" },
] as const;

export const PAGE_SIZE = 24;

export const MARKET_VALUES = [
  "forex",
  "crypto",
  "stocks",
  "indices",
  "futures",
  "commodities",
  "options",
] as const satisfies readonly MarketType[];

/** Narrows a query-string value to a real market, or null if it is not one. */
export function toMarket(value: string): MarketType | null {
  return MARKET_VALUES.find((market) => market === value) ?? null;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * The URL is the single source of truth for the library view. Parsing it
 * through a schema means a hand-edited or stale query string degrades to the
 * default rather than throwing on the server.
 */
export const filtersSchema = z.object({
  q: z.string().trim().max(120).catch("").default(""),
  direction: z.enum(["all", "long", "short"]).catch("all").default("all"),
  result: z.enum(["all", "win", "loss", "breakeven", "pending"]).catch("all").default("all"),
  market: z.string().trim().max(40).catch("all").default("all"),
  strategy: z.string().trim().max(120).catch("all").default("all"),
  favorites: z.enum(["all", "only"]).catch("all").default("all"),
  range: z
    .enum(["all", "today", "7d", "30d", "90d", "year", "custom"])
    .catch("all")
    .default("all"),
  from: isoDate.nullable().catch(null).default(null),
  to: isoDate.nullable().catch(null).default(null),
  rr: z.enum(["all", "1", "1.5", "2", "3"]).catch("all").default("all"),
  sort: z
    .enum(["newest", "oldest", "updated", "rr_desc", "rr_asc", "entry_desc", "entry_asc"])
    .catch("newest")
    .default("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1).default(1),
});

export type SetupFilters = z.infer<typeof filtersSchema>;

export const DEFAULT_FILTERS: SetupFilters = filtersSchema.parse({});

export function parseFilters(
  params: Record<string, string | string[] | undefined>,
): SetupFilters {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single !== undefined && single !== "") flat[key] = single;
  }
  return filtersSchema.parse(flat);
}

/** Only non-default values reach the URL, so a clean view has a clean link. */
export function toSearchParams(filters: SetupFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) continue;
    const fallback = DEFAULT_FILTERS[key as keyof SetupFilters];
    if (value === fallback) continue;
    params.set(key, String(value));
  }
  return params;
}

export function filtersHref(filters: SetupFilters, pathname = "/setups") {
  const query = toSearchParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** True when anything other than sort/page differs from the default. */
export function hasActiveFilters(filters: SetupFilters) {
  return (
    filters.q !== "" ||
    filters.direction !== "all" ||
    filters.result !== "all" ||
    filters.market !== "all" ||
    filters.strategy !== "all" ||
    filters.favorites !== "all" ||
    filters.range !== "all" ||
    filters.rr !== "all"
  );
}

export interface ActiveChip {
  key: keyof SetupFilters;
  label: string;
}

const DIRECTION_LABELS: Record<string, string> = { long: "Long", short: "Short" };
const RESULT_LABELS: Record<string, string> = {
  win: "Win",
  loss: "Loss",
  breakeven: "Break even",
  pending: "No result",
};

export function activeChips(
  filters: SetupFilters,
  marketLabels: Record<string, string>,
): ActiveChip[] {
  const chips: ActiveChip[] = [];

  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”` });
  if (filters.direction !== "all") {
    chips.push({ key: "direction", label: DIRECTION_LABELS[filters.direction] });
  }
  if (filters.result !== "all") {
    chips.push({ key: "result", label: RESULT_LABELS[filters.result] });
  }
  if (filters.market !== "all") {
    chips.push({
      key: "market",
      label: marketLabels[filters.market] ?? filters.market,
    });
  }
  if (filters.strategy !== "all") {
    chips.push({ key: "strategy", label: filters.strategy });
  }
  if (filters.favorites === "only") {
    chips.push({ key: "favorites", label: "Favourites" });
  }
  if (filters.range !== "all") {
    const label =
      filters.range === "custom"
        ? `${filters.from ?? "…"} → ${filters.to ?? "…"}`
        : (DATE_RANGE_OPTIONS.find((option) => option.value === filters.range)
            ?.label ?? "Date");
    chips.push({ key: "range", label });
  }
  if (filters.rr !== "all") chips.push({ key: "rr", label: `${filters.rr}R+` });

  return chips;
}

/** Resolves a range key into the inclusive [from, to] dates used by the query. */
export function resolveDateRange(
  filters: SetupFilters,
  today = new Date(),
): { from: string | null; to: string | null } {
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const daysAgo = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return iso(date);
  };

  switch (filters.range) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "7d":
      return { from: daysAgo(6), to: iso(today) };
    case "30d":
      return { from: daysAgo(29), to: iso(today) };
    case "90d":
      return { from: daysAgo(89), to: iso(today) };
    case "year":
      return { from: `${today.getFullYear()}-01-01`, to: iso(today) };
    case "custom":
      return { from: filters.from, to: filters.to };
    default:
      return { from: null, to: null };
  }
}

export type FilterFacets = {
  markets: MarketType[];
  strategies: string[];
};

export type { TradeDirection, TradeResult, MarketType };
