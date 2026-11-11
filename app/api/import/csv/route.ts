import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  IMPORT_LIMITS,
  importTrades,
  recentImportCount,
  type ImportReport,
} from "@/services/csv-import.service";
import type { NormalisedTrade } from "@/features/import/lib/trade-normalizer";

export const maxDuration = 60;

/**
 * Writes an import.
 *
 * The user is taken from the verified session and never from the body — the
 * payload carries trades, not ownership. Parsing and normalisation already
 * happened in the browser, which keeps a large file off the wire, and none of
 * it is believed: the service re-validates every row and re-checks every
 * duplicate before anything is written.
 *
 * Rows are inserted with the caller's own session client rather than the
 * service role, so Supabase RLS is the final authority on who owns what. A
 * forged `user_id` would be rejected by the row-level policy even if it got
 * past the code above.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You need to be signed in to import trades." },
      { status: 401 },
    );
  }

  let body: { trades?: unknown; skipDuplicates?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (!Array.isArray(body.trades)) {
    return NextResponse.json(
      { error: "No trades were sent." },
      { status: 400 },
    );
  }

  if (body.trades.length === 0) {
    return NextResponse.json(
      { error: "There is nothing to import." },
      { status: 400 },
    );
  }

  if (body.trades.length > IMPORT_LIMITS.maxRows) {
    return NextResponse.json(
      {
        error: `An import is limited to ${IMPORT_LIMITS.maxRows.toLocaleString("en-GB")} rows. Split the file and import it in parts.`,
        code: "too_many_rows",
      },
      { status: 413 },
    );
  }

  // Rate limit before doing any work, so a loop cannot cost thousands of
  // inserts before being told to stop.
  try {
    const recent = await recentImportCount(supabase, user.id);
    if (recent >= IMPORT_LIMITS.maxPerHour) {
      return NextResponse.json(
        {
          error: `You have run ${recent} imports in the last hour. Wait a little before the next one.`,
          code: "rate_limited",
        },
        { status: 429, headers: { "retry-after": "600" } },
      );
    }
  } catch (error) {
    console.error("Import rate check failed", { userId: user.id, error });
    return NextResponse.json(
      { error: "Could not start the import. Try again." },
      { status: 503 },
    );
  }

  let report: ImportReport;
  try {
    report = await importTrades(supabase, user.id, {
      trades: body.trades as NormalisedTrade[],
      skipDuplicates: body.skipDuplicates !== false,
    });
  } catch (error) {
    // The detail goes to the server log; the client gets a sentence. A
    // Postgres error message can name columns and constraints, which is
    // information about the schema rather than about the user's data.
    console.error("Import failed", { userId: user.id, error });
    return NextResponse.json(
      { error: "The import could not be completed. Nothing partial was left behind that you cannot see in your library." },
      { status: 500 },
    );
  }

  return NextResponse.json(report, { status: 200 });
}
