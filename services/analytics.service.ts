import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveDateRange, toMarket, type SetupFilters } from "@/features/setups/filters";
import type { AnalyticsRow } from "@/features/analytics/utils/compute";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Only the columns the maths needs, plus title and ticker so the calendar can
 * list a day's setups without a second request. Screenshots, notes and tags are
 * the bulk of a setup row and appear in no metric, so analytics never pays to
 * transfer them.
 */
const ANALYTICS_COLUMNS =
  "id,title,ticker,traded_on,created_at,result,direction,market,strategy,entry,stop_loss,take_profit,risk_reward,tags,screenshot_path,notes_length,is_favorite";

/** PostgREST caps a response at 1000 rows, so large libraries are paged through. */
const CHUNK = 1000;
const MAX_ROWS = 20_000;

/**
 * Loads the filtered set for analytics in as few round trips as possible.
 *
 * The same filter model as the library drives this, so a date range or market
 * chosen on /setups means the same thing here. Every query is scoped to
 * `user_id` and RLS refuses anything else.
 */
export async function fetchAnalyticsRows(
  supabase: Client,
  userId: string,
  filters: SetupFilters,
): Promise<{ rows: AnalyticsRow[]; truncated: boolean }> {
  const rows: AnalyticsRow[] = [];
  let offset = 0;

  for (;;) {
    let query = supabase
      .from("setups")
      .select(ANALYTICS_COLUMNS)
      .eq("user_id", userId);

    if (filters.q) {
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

    const { data, error } = await query
      .order("created_at", { ascending: true })
      .range(offset, offset + CHUNK - 1);

    if (error) throw error;

    const batch = (data ?? []) as unknown as AnalyticsRow[];
    rows.push(...batch);

    if (batch.length < CHUNK || rows.length >= MAX_ROWS) {
      return { rows, truncated: rows.length >= MAX_ROWS };
    }
    offset += CHUNK;
  }
}

/** Total rows the user owns, ignoring filters — used to tell empty apart from filtered-empty. */
export async function countAllSetups(
  supabase: Client,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("setups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}
