import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PAGE_SIZE,
  resolveDateRange,
  toMarket,
  type SetupFilters,
} from "@/features/setups/filters";
import type {
  Database,
  MarketType,
  SetupRow,
  TradeDirection,
  TradeResult,
} from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * The columns a card needs. `notes` is deliberately absent: it holds up to
 * 5000 characters that the grid never renders, and pulling it for 24 rows is
 * the difference between a small response and a large one.
 */
const LIST_COLUMNS =
  "id,user_id,title,ticker,market,direction,traded_on,traded_at,entry,stop_loss,take_profit,risk_reward,result,strategy,tags,screenshot_path,is_favorite,notes_length,created_at,updated_at";

export type SetupListItem = Omit<SetupRow, "notes" | "search_text">;

export interface SetupPage {
  rows: SetupListItem[];
  /** Rows matching the current filters, across all pages. */
  total: number;
  /** Rows the user owns in total, ignoring filters. */
  libraryTotal: number;
  page: number;
  pageCount: number;
}

/**
 * The shape the application writes. `user_id` is deliberately absent: it is
 * supplied from the verified session at the call site and enforced again by the
 * `setups_insert_own` policy, so a client cannot claim someone else's row.
 */
export interface SetupInput {
  title: string;
  ticker: string;
  market: MarketType;
  direction: TradeDirection;
  traded_on: string | null;
  traded_at: string | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  result: TradeResult;
  strategy: string | null;
  notes: string | null;
  tags: string[];
  is_favorite: boolean;
}

export interface SetupStats {
  total: number;
  favorites: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
  /** Null until at least one setup has a decided result. */
  winRate: number | null;
  /** Null until at least one setup carries a risk-to-reward figure. */
  averageRiskReward: number | null;
}

export interface ListSetupsOptions {
  favoritesOnly?: boolean;
  limit?: number;
  /**
   * Phase 3 hooks: search, market, direction, result, strategy, tag and date
   * filters slot in here without changing any call site.
   */
  orderBy?: "created_at" | "updated_at" | "traded_on";
  ascending?: boolean;
}

export async function listSetups(
  supabase: Client,
  userId: string,
  options: ListSetupsOptions = {},
): Promise<SetupRow[]> {
  const {
    favoritesOnly = false,
    limit,
    orderBy = "created_at",
    ascending = false,
  } = options;

  let query = supabase
    .from("setups")
    .select("*")
    .eq("user_id", userId)
    .order(orderBy, { ascending, nullsFirst: false });

  if (favoritesOnly) query = query.eq("is_favorite", true);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSetupById(
  supabase: Client,
  userId: string,
  id: string,
): Promise<SetupRow | null> {
  const { data, error } = await supabase
    .from("setups")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createSetup(
  supabase: Client,
  userId: string,
  input: SetupInput,
): Promise<SetupRow> {
  const { data, error } = await supabase
    .from("setups")
    .insert({ ...input, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateSetup(
  supabase: Client,
  userId: string,
  id: string,
  input: Partial<SetupInput> & { screenshot_path?: string | null },
): Promise<SetupRow> {
  const { data, error } = await supabase
    .from("setups")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setScreenshotPath(
  supabase: Client,
  userId: string,
  id: string,
  screenshotPath: string | null,
): Promise<SetupRow> {
  return updateSetup(supabase, userId, id, { screenshot_path: screenshotPath });
}

export async function deleteSetup(
  supabase: Client,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("setups")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function setFavorite(
  supabase: Client,
  userId: string,
  id: string,
  isFavorite: boolean,
): Promise<SetupRow> {
  return updateSetup(supabase, userId, id, { is_favorite: isFavorite });
}

/**
 * Real counts, straight from the database. Nothing here is derived from a
 * hardcoded number, and every figure is null-safe when the library is empty.
 *
 * The risk-to-reward average is computed in JS over a single-column read; when
 * libraries get large this moves to a database view.
 */
export async function getSetupStats(
  supabase: Client,
  userId: string,
): Promise<SetupStats> {
  const base = () =>
    supabase
      .from("setups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

  const [total, favorites, wins, losses, breakeven, pending, ratios] =
    await Promise.all([
      base(),
      base().eq("is_favorite", true),
      base().eq("result", "win"),
      base().eq("result", "loss"),
      base().eq("result", "breakeven"),
      base().eq("result", "pending"),
      supabase
        .from("setups")
        .select("risk_reward")
        .eq("user_id", userId)
        .not("risk_reward", "is", null),
    ]);

  for (const response of [
    total,
    favorites,
    wins,
    losses,
    breakeven,
    pending,
    ratios,
  ]) {
    if (response.error) throw response.error;
  }

  const winCount = wins.count ?? 0;
  const lossCount = losses.count ?? 0;
  const decided = winCount + lossCount;

  const values = (ratios.data ?? [])
    .map((row) => Number(row.risk_reward))
    .filter((value) => Number.isFinite(value));

  const averageRiskReward =
    values.length === 0
      ? null
      : Math.round(
          (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
        ) / 100;

  return {
    total: total.count ?? 0,
    favorites: favorites.count ?? 0,
    wins: winCount,
    losses: lossCount,
    breakeven: breakeven.count ?? 0,
    pending: pending.count ?? 0,
    winRate: decided === 0 ? null : Math.round((winCount / decided) * 100),
    averageRiskReward,
  };
}

/**
 * The one query behind the library view: search, filters, sort and pagination
 * in a single round trip, with an exact count for the result summary.
 *
 * Every clause is appended server-side and scoped to `user_id`; Row Level
 * Security rejects anything else regardless of what the query string says.
 */
export async function querySetups(
  supabase: Client,
  userId: string,
  filters: SetupFilters,
): Promise<SetupPage> {
  let query = supabase
    .from("setups")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (filters.q) {
    // search_text is a lowercased, trigram-indexed concatenation of title,
    // ticker, market, strategy, notes and tags (migration 0003).
    const term = filters.q.toLowerCase().replace(/[%_]/g, "");
    if (term) query = query.ilike("search_text", `%${term}%`);
  }

  if (filters.direction !== "all") query = query.eq("direction", filters.direction);
  if (filters.result !== "all") query = query.eq("result", filters.result);
  const market = filters.market === "all" ? null : toMarket(filters.market);
  if (market) query = query.eq("market", market);
  if (filters.strategy !== "all") query = query.eq("strategy", filters.strategy);
  if (filters.favorites === "only") query = query.eq("is_favorite", true);
  if (filters.rr !== "all") query = query.gte("risk_reward", Number(filters.rr));

  const { from, to } = resolveDateRange(filters);
  if (from) query = query.gte("traded_on", from);
  if (to) query = query.lte("traded_on", to);

  // Sorting always ends on created_at so equal values keep a stable order
  // between pages.
  switch (filters.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "updated":
      query = query
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    case "rr_desc":
      query = query
        .order("risk_reward", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "rr_asc":
      query = query
        .order("risk_reward", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "entry_desc":
      query = query
        .order("entry", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "entry_asc":
      query = query
        .order("entry", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const offset = (filters.page - 1) * PAGE_SIZE;
  query = query.range(offset, offset + PAGE_SIZE - 1);

  const [result, library] = await Promise.all([
    query,
    supabase
      .from("setups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  if (result.error) throw result.error;
  if (library.error) throw library.error;

  const total = result.count ?? 0;

  return {
    rows: (result.data ?? []) as unknown as SetupListItem[],
    total,
    libraryTotal: library.count ?? 0,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * The markets and strategies the user actually has, so the filter panel offers
 * real values rather than a hardcoded list.
 */
export async function getFilterFacets(
  supabase: Client,
  userId: string,
): Promise<{ markets: MarketType[]; strategies: string[] }> {
  const { data, error } = await supabase
    .from("setups")
    .select("market,strategy")
    .eq("user_id", userId);

  if (error) throw error;

  const markets = new Set<MarketType>();
  const strategies = new Set<string>();

  for (const row of data ?? []) {
    if (row.market) markets.add(row.market);
    if (row.strategy) strategies.add(row.strategy);
  }

  return {
    markets: [...markets].sort(),
    strategies: [...strategies].sort((a, b) => a.localeCompare(b)),
  };
}

/** Kept for the dashboard's existing call sites. */
export async function listRecentSetups(
  supabase: Client,
  userId: string,
  limit = 5,
): Promise<SetupRow[]> {
  return listSetups(supabase, userId, { limit });
}

export async function listFavoriteSetups(
  supabase: Client,
  userId: string,
  limit = 5,
): Promise<SetupRow[]> {
  return listSetups(supabase, userId, {
    favoritesOnly: true,
    limit,
    orderBy: "updated_at",
  });
}
