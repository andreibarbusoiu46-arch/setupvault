import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { NormalisedTrade } from "@/features/import/lib/trade-normalizer";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Writing an import, safely, on the server.
 *
 * The client has already parsed, mapped and normalised the file — that work
 * happens in the browser so a 5MB CSV never crosses the wire and the preview
 * is instant. None of it is trusted here. Every row is re-validated, the user
 * comes from the verified session rather than the payload, and the duplicate
 * check runs again against the database.
 *
 * Three things make the duplicate guarantee real rather than nominal:
 *
 *   the fingerprints in the payload are checked against existing rows;
 *   rows repeated inside one payload are collapsed before insertion;
 *   the partial unique index on (user_id, import_fingerprint) catches
 *   whatever slips between the check and the insert.
 *
 * The third is the one that matters. The first two can both be raced by two
 * requests arriving together — they each read, each see nothing, each insert.
 * Only the index can refuse the second, which is why the insert below is
 * written to survive that refusal rather than treat it as a failure.
 */

export const IMPORT_LIMITS = {
  /** Rows per request. A broker year is a few thousand; beyond this is a bug. */
  maxRows: 5_000,
  /** Rows per database round trip. */
  batchSize: 200,
  /** Imports per hour, per user. */
  maxPerHour: 10,
} as const;

export interface ImportRequest {
  trades: NormalisedTrade[];
  /** When false, a row matching an existing trade is inserted anyway. */
  skipDuplicates: boolean;
}

export interface RowFailure {
  fingerprint: string;
  ticker: string;
  reason: string;
}

export interface ImportReport {
  batchId: string;
  imported: number;
  duplicatesSkipped: number;
  repeatsCollapsed: number;
  failed: number;
  failures: RowFailure[];
}

/* ── Validation, again ───────────────────────────────────────────────────── */

const MARKETS = new Set([
  "forex", "crypto", "stocks", "indices", "futures", "commodities", "options",
]);
const RESULTS = new Set(["win", "loss", "breakeven", "pending"]);

/**
 * The server's own check, duplicating the client's on purpose.
 *
 * A browser can be skipped entirely — the endpoint is reachable with curl —
 * so anything the database constraints enforce has to be enforced here too,
 * with a message, rather than discovered as a 500 from a check violation.
 */
function invalidReason(t: NormalisedTrade): string | null {
  if (!t.ticker || t.ticker.length > 20) return "Symbol missing or too long";
  if (!t.title || t.title.length > 120) return "Title missing or too long";
  if (!MARKETS.has(t.market)) return `Unknown market "${t.market}"`;
  if (t.direction !== "long" && t.direction !== "short") return "Direction must be long or short";
  if (!RESULTS.has(t.result)) return `Unknown result "${t.result}"`;
  if (!t.import_fingerprint) return "Missing fingerprint";

  for (const [name, value] of [
    ["entry", t.entry], ["exit price", t.exit_price], ["stop loss", t.stop_loss],
    ["take profit", t.take_profit], ["size", t.size], ["P&L", t.pnl],
    ["commission", t.commission], ["swap", t.swap], ["risk/reward", t.risk_reward],
  ] as const) {
    if (value !== null && !Number.isFinite(value)) return `${name} is not a number`;
  }

  if (t.size !== null && t.size < 0) return "Negative position size";
  if (t.risk_reward !== null && (t.risk_reward < 0 || t.risk_reward > 1000)) {
    return "Risk/reward outside the allowed range";
  }
  if (t.timeframe && t.timeframe.length > 16) return "Timeframe too long";
  if (t.notes && t.notes.length > 5000) return "Notes too long";
  if (t.strategy && t.strategy.length > 120) return "Strategy too long";

  for (const [name, value] of [["opened_at", t.opened_at], ["closed_at", t.closed_at]] as const) {
    if (value !== null && Number.isNaN(new Date(value).getTime())) {
      return `${name} is not a date`;
    }
  }
  if (t.opened_at && t.closed_at && new Date(t.closed_at) < new Date(t.opened_at)) {
    return "Closes before it opens";
  }
  if (t.traded_on !== null && !/^\d{4}-\d{2}-\d{2}$/.test(t.traded_on)) {
    return "traded_on is not a date";
  }

  return null;
}

/* ── Rate limiting ───────────────────────────────────────────────────────── */

/**
 * Imports in the last hour, counted from the rows they wrote.
 *
 * There is no separate ledger: an import is identifiable by its batch id, so
 * counting distinct batches in the window is the same question without
 * another table to keep in step.
 */
export async function recentImportCount(
  supabase: Client,
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("setups")
    .select("import_batch_id")
    .eq("user_id", userId)
    .eq("source", "csv_import")
    .gte("created_at", since)
    .not("import_batch_id", "is", null)
    .limit(2_000);

  if (error) throw error;
  return new Set((data ?? []).map((r) => r.import_batch_id)).size;
}

/* ── Duplicates against the database ─────────────────────────────────────── */

/**
 * Which of these fingerprints the user already has.
 *
 * Chunked because a Postgres `in` list is not free and a 5,000-row import
 * would otherwise build one enormous predicate.
 */
export async function findExistingFingerprints(
  supabase: Client,
  userId: string,
  fingerprints: string[],
): Promise<Set<string>> {
  const found = new Set<string>();
  const unique = [...new Set(fingerprints)];

  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    const { data, error } = await supabase
      .from("setups")
      .select("import_fingerprint")
      .eq("user_id", userId)
      .in("import_fingerprint", chunk);

    if (error) throw error;
    for (const row of data ?? []) {
      if (row.import_fingerprint) found.add(row.import_fingerprint);
    }
  }

  return found;
}

/* ── The import ──────────────────────────────────────────────────────────── */

/** Postgres unique-violation. The index did its job; this is not an error. */
const UNIQUE_VIOLATION = "23505";

export async function importTrades(
  supabase: Client,
  userId: string,
  { trades, skipDuplicates }: ImportRequest,
): Promise<ImportReport> {
  const batchId = crypto.randomUUID();
  const failures: RowFailure[] = [];

  // 1. Re-validate everything.
  const valid: NormalisedTrade[] = [];
  for (const trade of trades) {
    const reason = invalidReason(trade);
    if (reason) {
      failures.push({
        fingerprint: trade.import_fingerprint ?? "",
        ticker: trade.ticker ?? "",
        reason,
      });
    } else {
      valid.push(trade);
    }
  }

  // 2. Collapse repeats inside this payload. Without this the unique index
  //    would reject them one at a time and the report would call them
  //    failures, when in fact the file simply listed a fill twice.
  const seen = new Set<string>();
  const deduped: NormalisedTrade[] = [];
  let repeatsCollapsed = 0;
  for (const trade of valid) {
    if (seen.has(trade.import_fingerprint)) {
      repeatsCollapsed++;
      continue;
    }
    seen.add(trade.import_fingerprint);
    deduped.push(trade);
  }

  // 3. Duplicates the user already has.
  const existing = await findExistingFingerprints(
    supabase,
    userId,
    deduped.map((t) => t.import_fingerprint),
  );

  let duplicatesSkipped = 0;
  const toInsert = deduped.filter((trade) => {
    if (!existing.has(trade.import_fingerprint)) return true;
    if (skipDuplicates) {
      duplicatesSkipped++;
      return false;
    }
    // Keeping a duplicate means giving it a fingerprint the index will
    // accept, since the whole point of the index is that one cannot exist
    // twice. Null is the honest value: this row is deliberately not
    // participating in deduplication.
    return true;
  });

  // 4. Insert in batches.
  let imported = 0;

  for (let i = 0; i < toInsert.length; i += IMPORT_LIMITS.batchSize) {
    const batch = toInsert.slice(i, i + IMPORT_LIMITS.batchSize);

    const rows = batch.map((trade) => ({
      user_id: userId,
      source: "csv_import" as const,
      import_batch_id: batchId,
      ...trade,
      // A row the user chose to keep despite being a duplicate opts out of
      // the unique index rather than fighting it.
      import_fingerprint:
        !skipDuplicates && existing.has(trade.import_fingerprint)
          ? null
          : trade.import_fingerprint,
    }));

    const { data, error } = await supabase.from("setups").insert(rows).select("id");

    if (!error) {
      imported += data?.length ?? 0;
      continue;
    }

    // A batch failing wholesale is usually one bad row. Retry individually so
    // the other 199 still land and the report can name the one that did not —
    // "partial failures handled safely" rather than losing the batch.
    for (const row of rows) {
      const single = await supabase.from("setups").insert(row).select("id");

      if (!single.error) {
        imported++;
        continue;
      }

      if (single.error.code === UNIQUE_VIOLATION) {
        // Something inserted this between our check and now — another tab,
        // a double-submitted form. The guard worked; this is a skip.
        duplicatesSkipped++;
        continue;
      }

      failures.push({
        fingerprint: row.import_fingerprint ?? "",
        ticker: row.ticker,
        // The provider's message can carry column detail that is fine for the
        // owner of the row but is not a stack trace.
        reason: single.error.message.slice(0, 200),
      });
    }
  }

  return {
    batchId,
    imported,
    duplicatesSkipped,
    repeatsCollapsed,
    failed: failures.length,
    failures: failures.slice(0, 50),
  };
}
