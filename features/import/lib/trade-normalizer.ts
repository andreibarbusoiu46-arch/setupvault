import { createHash } from "node:crypto";

import {
  TRADE_FIELDS,
  TRADE_FIELD_KEYS,
  type TradeField,
} from "@/features/import/lib/column-aliases";
import {
  detectDateConvention,
  detectNumberConvention,
  parseDate,
  parseDirection,
  parseNumber,
  type DateConvention,
  type NumberConvention,
} from "@/features/import/lib/conventions";
import { inferMarket } from "@/features/import/lib/market";
import type { MarketType, TradeDirection, TradeResult } from "@/types/database";

/**
 * One CSV row in, one insertable setup out — or a list of reasons why not.
 *
 * Everything uncertain is surfaced rather than resolved. A row with an issue
 * still comes back, carrying its issues, so the preview can show the user
 * what is wrong instead of a count of rows that silently vanished. The brief
 * is explicit about that: "Do not silently discard malformed data."
 *
 * Three values are derived rather than read, because the table requires them
 * and no export carries them:
 *
 *   `title`   — generated from the symbol, direction and date.
 *   `market`  — inferred from the symbol, with a per-file fallback.
 *   `result`  — taken from the sign of the broker's own PnL.
 *
 * That last one is worth distinguishing from the thing the brief forbids.
 * Inferring DIRECTION from PnL is wrong, because a losing long and a winning
 * short look identical. Inferring OUTCOME from PnL is just reading it: a
 * positive realised PnL is what "win" means. The two are not the same
 * inference and only one of them is guessing.
 */

export type Severity = "error" | "warning";

export interface RowIssue {
  field: TradeField | "market" | "row";
  severity: Severity;
  message: string;
}

/** Shaped for a `setups` insert; user_id and batch are added server-side. */
export interface NormalisedTrade {
  title: string;
  ticker: string;
  market: MarketType;
  direction: TradeDirection;
  entry: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  size: number | null;
  pnl: number | null;
  commission: number | null;
  swap: number | null;
  opened_at: string | null;
  closed_at: string | null;
  traded_on: string | null;
  traded_at: string | null;
  timeframe: string | null;
  strategy: string | null;
  notes: string | null;
  result: TradeResult;
  risk_reward: number | null;
  import_fingerprint: string;
}

export interface NormalisedRow {
  /** 1-based index in the file, as the user sees it in a spreadsheet. */
  line: number;
  trade: NormalisedTrade | null;
  issues: RowIssue[];
  /** True when nothing blocks insertion. Warnings do not block. */
  valid: boolean;
}

/** Column index per field, as the mapping step settled it. */
export type FieldMapping = Partial<Record<TradeField, number | null>>;

export interface Conventions {
  numbers: Record<string, NumberConvention>;
  dates: Record<string, DateConvention>;
}

export interface NormaliseOptions {
  mapping: FieldMapping;
  /** Used when a symbol's market cannot be recognised. */
  fallbackMarket: MarketType;
  /** Overrides the detected convention when the user chose one. */
  dateOrderOverride?: DateConvention["order"];
  decimalOverride?: NumberConvention["decimal"];
}

/* ── Conventions across the whole file ───────────────────────────────────── */

/**
 * Decides each mapped column's convention once, from every value in it.
 *
 * This is the step that makes the per-cell parsing safe, and it has to happen
 * before any row is read — which is why it is a separate pass rather than
 * something the row loop does lazily.
 */
export function detectConventions(
  rows: string[][],
  mapping: FieldMapping,
  overrides: Pick<NormaliseOptions, "dateOrderOverride" | "decimalOverride"> = {},
): Conventions {
  const numbers: Conventions["numbers"] = {};
  const dates: Conventions["dates"] = {};

  for (const field of TRADE_FIELD_KEYS) {
    const col = mapping[field];
    if (col === null || col === undefined) continue;

    const values = rows.map((r) => r[col] ?? "");
    const kind = TRADE_FIELDS[field].kind;

    if (kind === "number") {
      const detected = detectNumberConvention(values);
      numbers[field] = overrides.decimalOverride
        ? { ...detected, decimal: overrides.decimalOverride, decided: true }
        : detected;
    } else if (kind === "date") {
      const detected = detectDateConvention(values);
      dates[field] = overrides.dateOrderOverride
        ? { ...detected, order: overrides.dateOrderOverride, decided: true }
        : detected;
    }
  }

  return { numbers, dates };
}

/* ── Derivations ─────────────────────────────────────────────────────────── */

/** "EURUSD long · 3 Apr 2026", or without the date when there is none. */
function makeTitle(
  ticker: string,
  direction: TradeDirection,
  openedAt: string | null,
): string {
  const when = openedAt
    ? new Date(openedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  const title = [ticker, direction, when].filter(Boolean).join(" · ");
  // The column caps at 120 and a long symbol plus a date cannot reach it,
  // but the slice means a pathological ticker fails validation rather than
  // the insert.
  return title.slice(0, 120);
}

/**
 * Outcome from the broker's realised figure.
 *
 * `pending` when there is no PnL, because an import of open positions is a
 * legitimate thing to do and calling those losses would be a lie. Exactly
 * zero is a breakeven, which is its own category in this schema and is
 * excluded from win-rate denominators elsewhere.
 */
function deriveResult(pnl: number | null, closedAt: string | null): TradeResult {
  if (pnl === null) return closedAt ? "breakeven" : "pending";
  if (pnl > 0) return "win";
  if (pnl < 0) return "loss";
  return "breakeven";
}

/**
 * R multiple from the levels, when all three are present and coherent.
 *
 * Returns null rather than a number whenever the geometry is wrong — a stop
 * on the wrong side of entry gives a negative or infinite R that would
 * poison every average it entered. The existing risk-reward helper owns this
 * arithmetic for manually entered setups; this mirrors it so an imported
 * trade and a typed one are scored by the same rule.
 */
function deriveRiskReward(
  direction: TradeDirection,
  entry: number | null,
  stop: number | null,
  target: number | null,
): number | null {
  if (entry === null || stop === null || target === null) return null;

  const risk = direction === "long" ? entry - stop : stop - entry;
  const reward = direction === "long" ? target - entry : entry - target;

  if (!(risk > 0) || !(reward > 0)) return null;

  const ratio = reward / risk;
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio > 1000) return null;

  return Math.round(ratio * 100) / 100;
}

/**
 * The identity two imports of the same trade must share.
 *
 * Ticker, direction, entry and the opening moment, as the brief specifies.
 * Everything is normalised before hashing so that "EUR/USD" and "EURUSD",
 * `1.08420` and `1.0842`, and the same instant written in two time zones all
 * land on one fingerprint — otherwise the guard only catches byte-identical
 * re-exports, which is the easy half of the problem.
 *
 * Entry is rounded to eight significant figures, not truncated: brokers
 * re-export the same fill at different precisions, and a raw string compare
 * would let 1.084200 past 1.0842.
 */
export function fingerprint(
  ticker: string,
  direction: TradeDirection | null,
  entry: number | null,
  openedAt: string | null,
): string {
  const parts = [
    ticker.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    direction ?? "",
    entry === null ? "" : Number(entry.toPrecision(8)).toString(),
    // To the minute. Exports disagree about seconds on the same fill.
    openedAt ? openedAt.slice(0, 16) : "",
  ];

  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

/* ── The row ─────────────────────────────────────────────────────────────── */

function cell(row: string[], col: number | null | undefined): string | null {
  if (col === null || col === undefined) return null;
  const v = row[col];
  return v === undefined ? null : v;
}

export function normaliseRow(
  row: string[],
  line: number,
  conventions: Conventions,
  options: NormaliseOptions,
): NormalisedRow {
  const { mapping } = options;
  const issues: RowIssue[] = [];
  const add = (field: RowIssue["field"], severity: Severity, message: string) =>
    issues.push({ field, severity, message });

  const nothingHere = row.every((v) => !v?.trim());
  if (nothingHere) {
    return { line, trade: null, issues: [], valid: false };
  }

  /* Symbol — required. */
  const rawTicker = cell(row, mapping.ticker)?.trim() ?? "";
  if (!rawTicker) add("ticker", "error", "No symbol");
  const ticker = rawTicker.toUpperCase().slice(0, 20);

  /* Direction — required, and never inferred from profit. */
  const dir = parseDirection(cell(row, mapping.direction));
  if (dir.issue) add("direction", "error", dir.issue);
  else if (!dir.value) add("direction", "error", "No direction");

  /* Numbers. */
  const readNumber = (field: TradeField) => {
    const convention = conventions.numbers[field];
    if (!convention) return null;
    const raw = cell(row, mapping[field]);
    const parsed = parseNumber(raw, convention);
    if (parsed.issue) add(field, "error", parsed.issue);
    else if (parsed.value !== null && !convention.decided && /[.,]/.test(String(raw))) {
      add(
        field,
        "warning",
        convention.conflict
          ? `This column mixes number formats (${convention.evidence}) — check the value`
          : `Could be ${parsed.value} or a thousands-separated number — confirm the decimal mark`,
      );
    }
    return parsed.value;
  };

  const entry = readNumber("entry");
  const exitPrice = readNumber("exit_price");
  const stopLoss = readNumber("stop_loss");
  const takeProfit = readNumber("take_profit");
  const size = readNumber("size");
  const pnl = readNumber("pnl");
  const commission = readNumber("commission");
  const swap = readNumber("swap");

  if (size !== null && size < 0) {
    add("size", "error", "Negative position size");
  }

  /* Dates. */
  const readDate = (field: TradeField) => {
    const convention = conventions.dates[field];
    if (!convention) return null;
    const raw = cell(row, mapping[field]);
    const parsed = parseDate(raw, convention);
    if (parsed.issue) add(field, "error", parsed.issue);
    else if (parsed.iso && !convention.decided) {
      add(
        field,
        "warning",
        convention.conflict
          ? `This column mixes date orders (${convention.evidence}) — check the value`
          : "Day and month cannot be told apart in this column — confirm the order",
      );
    }
    return parsed.iso;
  };

  const openedAt = readDate("opened_at");
  const closedAt = readDate("closed_at");

  if (openedAt && closedAt && new Date(closedAt) < new Date(openedAt)) {
    add("closed_at", "error", "Closes before it opens");
  }

  /* Market, which has to be inferred. */
  const inferred = ticker ? inferMarket(ticker) : null;
  const market = inferred?.confident ? inferred.market : options.fallbackMarket;
  if (ticker && inferred && !inferred.confident) {
    add("market", "warning", `${inferred.because} — filed as ${options.fallbackMarket}`);
  }

  /* Geometry, as a warning rather than a rejection: a stop on the wrong side
     is a real trade someone really made, and refusing to import it would be
     the importer deciding what counts as a trade. */
  if (dir.value && entry !== null && stopLoss !== null) {
    const wrongSide =
      dir.value === "long" ? stopLoss >= entry : stopLoss <= entry;
    if (wrongSide) {
      add("stop_loss", "warning", `Stop is on the wrong side of entry for a ${dir.value}`);
    }
  }

  const blocked = issues.some((i) => i.severity === "error");
  if (blocked || !dir.value || !ticker) {
    return { line, trade: null, issues, valid: false };
  }

  const text = (field: TradeField, max: number) => {
    const v = cell(row, mapping[field])?.trim();
    return v ? v.slice(0, max) : null;
  };

  // traded_on and traded_at come from opened_at because the Setup Score and
  // the analytics read those two columns and nothing else. Without this an
  // imported trade is invisible to both.
  const tradedOn = openedAt ? openedAt.slice(0, 10) : null;
  const tradedAt = openedAt ? openedAt.slice(11, 19) : null;

  return {
    line,
    issues,
    valid: true,
    trade: {
      title: makeTitle(ticker, dir.value, openedAt),
      ticker,
      market,
      direction: dir.value,
      entry,
      exit_price: exitPrice,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      size,
      pnl,
      commission,
      swap,
      opened_at: openedAt,
      closed_at: closedAt,
      traded_on: tradedOn,
      traded_at: tradedAt,
      timeframe: text("timeframe", 16),
      strategy: text("strategy", 120),
      notes: text("notes", 5000),
      result: deriveResult(pnl, closedAt),
      risk_reward: deriveRiskReward(dir.value, entry, stopLoss, takeProfit),
      import_fingerprint: fingerprint(ticker, dir.value, entry, openedAt),
    },
  };
}

/* ── The file ────────────────────────────────────────────────────────────── */

export interface NormaliseResult {
  rows: NormalisedRow[];
  conventions: Conventions;
  counts: {
    total: number;
    valid: number;
    invalid: number;
    blank: number;
    warnings: number;
    duplicatesInFile: number;
  };
  /** Fingerprints seen more than once within this file. */
  repeatedInFile: Set<string>;
}

export function normaliseRows(
  rows: string[][],
  options: NormaliseOptions,
): NormaliseResult {
  const conventions = detectConventions(rows, options.mapping, options);

  const normalised = rows.map((row, i) =>
    normaliseRow(row, i + 1, conventions, options),
  );

  // Duplicates inside the file itself, which the brief asks for separately
  // from duplicates against the database: a broker export that overlaps its
  // own previous export is the common case.
  const seen = new Set<string>();
  const repeatedInFile = new Set<string>();
  for (const r of normalised) {
    const fp = r.trade?.import_fingerprint;
    if (!fp) continue;
    if (seen.has(fp)) repeatedInFile.add(fp);
    seen.add(fp);
  }

  const blank = normalised.filter((r) => !r.trade && r.issues.length === 0).length;
  const valid = normalised.filter((r) => r.valid).length;

  return {
    rows: normalised,
    conventions,
    repeatedInFile,
    counts: {
      total: rows.length,
      valid,
      invalid: normalised.length - valid - blank,
      blank,
      warnings: normalised.filter((r) =>
        r.issues.some((i) => i.severity === "warning"),
      ).length,
      duplicatesInFile: normalised.filter(
        (r) => r.trade && repeatedInFile.has(r.trade.import_fingerprint),
      ).length,
    },
  };
}
