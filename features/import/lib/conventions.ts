/**
 * Working out what a column means before reading any single value in it.
 *
 * This exists because the two hardest problems in a broker CSV cannot be
 * solved one cell at a time, and solving them one cell at a time is how
 * importers quietly corrupt people's records.
 *
 * `1.085` is 1.085 on a forex export and 1085 on a German one. `03/04/2026`
 * is 3 April or 4 March. Nothing in either string says which, so a parser
 * looking at it alone must either guess — and be wrong for a whole file — or
 * refuse everything, which is useless.
 *
 * The column is the unit that carries the answer. One row cannot tell you the
 * convention; sixty rows almost always can, because somewhere in them is a
 * value that only parses one way: a `1.234,56` with both separators, or a
 * `25/12/2026` whose first field cannot be a month. So the convention is
 * decided once from every value in the column, and then applied.
 *
 * When the evidence genuinely is not there, this says so rather than picking.
 * That is the whole point: the caller then asks the user, which is the only
 * honest resolution for a file where the information is absent.
 */

/* ── Numbers ─────────────────────────────────────────────────────────────── */

export type DecimalSeparator = "." | ",";

export interface NumberConvention {
  decimal: DecimalSeparator;
  /**
   * False when nothing in the column settled it. The caller must not treat
   * the `decimal` field as an answer in that case — it is only the default
   * that would be used if the user confirms it.
   */
  decided: boolean;
  /** Which value settled it, for showing the user why. */
  evidence: string | null;
  /** Set when different values in one column imply different conventions. */
  conflict: boolean;
}

const CURRENCY = /[$€£¥₹₽¢]|USD|EUR|GBP|JPY|CHF|AUD|CAD|NZD/gi;

/** Strips everything that is decoration rather than part of the number. */
function bare(raw: string): string {
  return raw
    .replace(CURRENCY, "")
    // Non-breaking and thin spaces are used as thousands separators in some
    // European exports, and they are invisible in a spreadsheet.
    .replace(/[\s   ]/g, "")
    .replace(/[+]/g, "")
    .trim();
}

/**
 * What a single value proves about the column, if anything.
 *
 * Four kinds of evidence, in descending strength:
 *
 * 1. Both separators present — the rightmost is the decimal, always. There is
 *    no notation where thousands groups come after the decimal point.
 * 2. One separator, and the digits after it are not a group of three — a
 *    thousands separator is always followed by exactly three, so this is a
 *    decimal. `1,25` and `1.2567` both settle it.
 * 3. One separator appearing more than once — thousands, necessarily.
 * 4. One separator followed by exactly three digits — proves nothing. This is
 *    the `1,085` case, and it is why this module exists.
 */
function evidenceFrom(value: string): DecimalSeparator | null {
  const s = bare(value);
  if (!/[\d]/.test(s)) return null;

  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;

  if (dots > 0 && commas > 0) {
    return s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
  }

  if (dots > 1) return ","; // periods are grouping, so a decimal would be a comma
  if (commas > 1) return "."; // and the reverse

  const single = dots === 1 ? "." : commas === 1 ? "," : null;
  if (!single) return null;

  const after = s.slice(s.lastIndexOf(single) + 1);
  // A trailing separator ("1,") settles nothing.
  if (after.length === 0) return null;
  // Exactly three digits is the ambiguous case; anything else is a decimal.
  if (/^\d{3}$/.test(after)) return null;
  if (/^\d+$/.test(after)) return single;

  return null;
}

export function detectNumberConvention(values: string[]): NumberConvention {
  const votes = new Map<DecimalSeparator, string>();

  for (const value of values) {
    if (!value?.trim()) continue;
    const vote = evidenceFrom(value);
    if (vote && !votes.has(vote)) votes.set(vote, value.trim());
  }

  if (votes.size === 1) {
    const [decimal, evidence] = [...votes][0];
    return { decimal, decided: true, evidence, conflict: false };
  }

  if (votes.size > 1) {
    // One column cannot be both. Something upstream concatenated two files,
    // or a cell is corrupt. Either way the user has to look.
    return {
      decimal: ".",
      decided: false,
      evidence: [...votes.values()].join(" vs "),
      conflict: true,
    };
  }

  // Every value was either empty, a plain integer, or the ambiguous
  // three-digit shape. A plain integer column is fine — no separator means
  // nothing to get wrong — so `decided` here is about whether a separator
  // was ever seen at all.
  const sawSeparator = values.some((v) => v && /[.,]/.test(bare(v)));
  return {
    decimal: ".",
    decided: !sawSeparator,
    evidence: null,
    conflict: false,
  };
}

export interface ParsedNumber {
  value: number | null;
  /** Why it could not be read, for the preview. Null when it parsed. */
  issue: string | null;
}

export function parseNumber(
  raw: string | null | undefined,
  convention: NumberConvention,
): ParsedNumber {
  if (raw === null || raw === undefined) return { value: null, issue: null };

  const trimmed = String(raw).trim();
  if (!trimmed) return { value: null, issue: null };

  let s = bare(trimmed);

  // Accounting negatives: (1,250.50) means -1250.50.
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  // A trailing minus, which some exports use.
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  if (!s) return { value: null, issue: null };

  const thousands = convention.decimal === "." ? "," : ".";
  // Remove grouping, then put the decimal point where this column says it is.
  const normalised = s
    .split(thousands)
    .join("")
    .replace(convention.decimal, ".");

  if (!/^\d*\.?\d*$/.test(normalised) || normalised === "." || !normalised) {
    return { value: null, issue: `Not a number: "${trimmed}"` };
  }

  const n = Number(normalised);
  if (!Number.isFinite(n)) return { value: null, issue: `Not a number: "${trimmed}"` };

  return { value: negative ? -n : n, issue: null };
}

/* ── Dates ───────────────────────────────────────────────────────────────── */

export type DateOrder = "dmy" | "mdy" | "ymd";

export interface DateConvention {
  order: DateOrder;
  /** False when no value in the column could settle day-vs-month. */
  decided: boolean;
  evidence: string | null;
  conflict: boolean;
}

/** Splits a date-like string into its three numeric fields, if it has them. */
function fields(value: string): [number, number, number] | null {
  const m = value
    .trim()
    .match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})(?:[\sT].*)?$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Which field is the day.
 *
 * A four-digit leading field is a year, and that is the end of it. Otherwise
 * the only proof available is a field above 12, which cannot be a month. A
 * column where every day happens to fall on or before the 12th is genuinely
 * undecidable, and this reports that instead of assuming the American order —
 * which is the specific failure that turns 3 April into 4 March for a whole
 * year of someone's records.
 */
export function detectDateConvention(values: string[]): DateConvention {
  const votes = new Map<DateOrder, string>();

  for (const value of values) {
    if (!value?.trim()) continue;
    const f = fields(value);
    if (!f) continue;
    const [a, b] = f;

    if (String(f[0]).length === 4) {
      if (!votes.has("ymd")) votes.set("ymd", value.trim());
      continue;
    }
    if (a > 12 && a <= 31) {
      if (!votes.has("dmy")) votes.set("dmy", value.trim());
      continue;
    }
    if (b > 12 && b <= 31) {
      if (!votes.has("mdy")) votes.set("mdy", value.trim());
    }
  }

  if (votes.size === 1) {
    const [order, evidence] = [...votes][0];
    return { order, decided: true, evidence, conflict: false };
  }
  if (votes.size > 1) {
    return {
      order: "dmy",
      decided: false,
      evidence: [...votes.values()].join(" vs "),
      conflict: true,
    };
  }

  // Nothing settled it. Every date fits both readings.
  return { order: "dmy", decided: false, evidence: null, conflict: false };
}

export interface ParsedDate {
  /** ISO 8601 with offset, ready for a timestamptz column. */
  iso: string | null;
  issue: string | null;
}

/** Seconds and milliseconds either side of a plausible trading window. */
const UNIX_SECONDS = { min: 946_684_800, max: 4_102_444_800 }; // 2000 → 2100

export function parseDate(
  raw: string | null | undefined,
  convention: DateConvention,
): ParsedDate {
  if (raw === null || raw === undefined) return { iso: null, issue: null };
  const value = String(raw).trim();
  if (!value) return { iso: null, issue: null };

  // A bare run of digits is a Unix timestamp, in seconds or milliseconds. The
  // two are told apart by magnitude, bounded so that a price or a ticket
  // number does not become a date in 1973.
  if (/^\d{9,14}$/.test(value)) {
    const n = Number(value);
    const seconds =
      n >= UNIX_SECONDS.min && n <= UNIX_SECONDS.max
        ? n
        : n / 1000 >= UNIX_SECONDS.min && n / 1000 <= UNIX_SECONDS.max
          ? n / 1000
          : null;
    if (seconds === null) {
      return { iso: null, issue: `Not a plausible timestamp: "${value}"` };
    }
    return { iso: new Date(seconds * 1000).toISOString(), issue: null };
  }

  // Anything carrying its own offset or a Z is already unambiguous, and the
  // platform's parser is the right tool for it.
  if (/\d{4}-\d{2}-\d{2}/.test(value) && /(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? { iso: null, issue: `Unreadable date: "${value}"` }
      : { iso: d.toISOString(), issue: null };
  }

  const f = fields(value);
  if (!f) {
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? { iso: null, issue: `Unrecognised date format: "${value}"` }
      : { iso: d.toISOString(), issue: null };
  }

  const [p1, p2, p3] = f;
  let year: number;
  let month: number;
  let day: number;

  if (convention.order === "ymd" || String(f[0]).length === 4) {
    [year, month, day] = [p1, p2, p3];
  } else if (convention.order === "mdy") {
    [month, day, year] = [p1, p2, p3];
  } else {
    [day, month, year] = [p1, p2, p3];
  }

  // Two-digit years: 70–99 are 1900s, everything else 2000s. Trading data
  // does not predate 1970 in any export that matters.
  if (year < 100) year += year >= 70 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { iso: null, issue: `Impossible date: "${value}"` };
  }

  const time = value.match(/[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hh = time ? Number(time[1]) : 0;
  const mm = time ? Number(time[2]) : 0;
  const ss = time && time[3] ? Number(time[3]) : 0;

  if (hh > 23 || mm > 59 || ss > 59) {
    return { iso: null, issue: `Impossible time in "${value}"` };
  }

  // Built as UTC. A CSV without an offset does not state a zone, and
  // inventing the importer's local zone would shift every row by however far
  // the server happens to be from the trader.
  const d = new Date(Date.UTC(year, month - 1, day, hh, mm, ss));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    // Catches 31 February, which Date would roll forward silently.
    return { iso: null, issue: `No such date: "${value}"` };
  }

  return { iso: d.toISOString(), issue: null };
}

/* ── Direction ───────────────────────────────────────────────────────────── */

export type Direction = "long" | "short";

const LONG = new Set([
  "long", "buy", "b", "bought", "buy/long", "long/buy", "buylimit",
  "buystop", "buy limit", "buy stop", "openlong", "open long", "l",
]);
const SHORT = new Set([
  "short", "sell", "s", "sold", "sell/short", "short/sell", "selllimit",
  "sellstop", "sell limit", "sell stop", "openshort", "open short",
]);

export interface ParsedDirection {
  value: Direction | null;
  issue: string | null;
}

/**
 * Reads a direction, or refuses.
 *
 * Note what this does not do: it never looks at profit to decide. A losing
 * long and a winning short are indistinguishable by sign, so inferring
 * direction from PnL inverts exactly the trades the trader most needs to
 * review honestly. An unreadable direction is reported and the row is held
 * for the user.
 */
export function parseDirection(raw: string | null | undefined): ParsedDirection {
  if (raw === null || raw === undefined) return { value: null, issue: null };

  const key = String(raw).trim().toLowerCase().replace(/[_-]+/g, " ");
  if (!key) return { value: null, issue: null };

  if (LONG.has(key)) return { value: "long", issue: null };
  if (SHORT.has(key)) return { value: "short", issue: null };

  // Deliberately narrow substring fallback, after the exact sets, so that
  // "sell" inside "resell" cannot win by accident.
  const compact = key.replace(/\s+/g, "");
  if (LONG.has(compact)) return { value: "long", issue: null };
  if (SHORT.has(compact)) return { value: "short", issue: null };

  return { value: null, issue: `Unrecognised direction: "${String(raw).trim()}"` };
}
