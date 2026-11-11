import {
  ALIASES,
  MUTUALLY_EXCLUSIVE,
  TRADE_FIELDS,
  TRADE_FIELD_KEYS,
  normaliseHeader,
  type TradeField,
} from "@/features/import/lib/column-aliases";
import { parseDirection } from "@/features/import/lib/conventions";

/**
 * Guessing which CSV column is which internal field, and saying how sure.
 *
 * The confidence is not decoration. The mapping step auto-selects only what
 * this reports as `exact`, and leaves anything weaker for the user to
 * confirm — because a wrong auto-mapping that looks right is worse than an
 * empty dropdown. A `fuzzy` match on a header like "Close" could be the exit
 * price or the close time, and only the person who exported the file knows.
 */

export type Confidence = "exact" | "strong" | "weak" | "none";

export interface FieldMatch {
  field: TradeField;
  /** Index into the header row, or null when nothing matched. */
  column: number | null;
  confidence: Confidence;
  /** Why, in words, for the mapping UI. */
  because: string | null;
  /** Other columns that also matched, so the user can see the alternatives. */
  alternatives: number[];
}

export interface Mapping {
  matches: Record<TradeField, FieldMatch>;
  /** Columns in the file that no field claimed. */
  unmatched: number[];
  /** Fields required by the trade model that nothing was found for. */
  missingRequired: TradeField[];
  /** Two fields pointing at one column, where that is probably wrong. */
  collisions: Array<{ column: number; fields: TradeField[] }>;
}

/* ── Value inspection ────────────────────────────────────────────────────── */

/**
 * What a column's values look like, used only when the header was no help.
 *
 * Header matching is preferred because it is evidence about intent; data
 * shape is evidence about form, and several fields share a form. A column of
 * numbers could be any of six price fields, so this can only narrow to a
 * kind, never to a field — which is why anything it produces is `weak`.
 */
function sniff(values: string[]): "direction" | "date" | "number" | "text" | "empty" {
  const sample = values.filter((v) => v?.trim()).slice(0, 40);
  if (sample.length === 0) return "empty";

  const directions = sample.filter((v) => parseDirection(v).value !== null).length;
  if (directions / sample.length > 0.8) return "direction";

  const dates = sample.filter((v) =>
    /^\d{4}-\d{2}-\d{2}/.test(v.trim()) ||
    /^\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/.test(v.trim()) ||
    /^\d{9,14}$/.test(v.trim()),
  ).length;
  if (dates / sample.length > 0.8) return "date";

  const numbers = sample.filter((v) => /^[-+(]?[\s$€£¥]*[\d.,\s]+\)?-?$/.test(v.trim())).length;
  if (numbers / sample.length > 0.8) return "number";

  return "text";
}

/* ── Matching ────────────────────────────────────────────────────────────── */

/** Exact alias hit, then a contained-substring fallback. */
function scoreHeader(normalised: string, field: TradeField): Confidence {
  const aliases = ALIASES[field];
  if (aliases.includes(normalised)) return "exact";

  // "entrypriceusd" contains "entryprice". Require the alias to be the longer
  // part of the match so that "price" does not claim "openpricecurrency".
  const hit = aliases.find(
    (a) => a.length >= 4 && (normalised.startsWith(a) || normalised.endsWith(a)),
  );
  if (hit) return "strong";

  const loose = aliases.find((a) => a.length >= 5 && normalised.includes(a));
  return loose ? "weak" : "none";
}

const RANK: Record<Confidence, number> = { exact: 3, strong: 2, weak: 1, none: 0 };

export function mapColumns(headers: string[], rows: string[][]): Mapping {
  const normalised = headers.map(normaliseHeader);
  const columnOf = (i: number) => rows.map((r) => r[i] ?? "");
  const kinds = headers.map((_, i) => sniff(columnOf(i)));

  const matches = {} as Record<TradeField, FieldMatch>;

  for (const field of TRADE_FIELD_KEYS) {
    const scored = normalised
      .map((h, i) => ({ i, c: scoreHeader(h, field) }))
      .filter((x) => x.c !== "none")
      .sort((a, b) => RANK[b.c] - RANK[a.c]);

    if (scored.length > 0) {
      const best = scored[0];
      matches[field] = {
        field,
        column: best.i,
        confidence: best.c,
        because:
          best.c === "exact"
            ? `Header "${headers[best.i]}" is a known name for this field`
            : `Header "${headers[best.i]}" looks like this field`,
        alternatives: scored.slice(1).map((x) => x.i),
      };
      continue;
    }

    // No header matched. The only remaining evidence is shape, and shape can
    // identify a direction column (its values are a small closed set) but
    // not which of six numeric fields a number column is.
    const wanted = TRADE_FIELDS[field].kind;
    if (wanted === "direction") {
      const i = kinds.indexOf("direction");
      if (i !== -1) {
        matches[field] = {
          field,
          column: i,
          confidence: "weak",
          because: `Column "${headers[i]}" contains buy/sell values`,
          alternatives: [],
        };
        continue;
      }
    }

    matches[field] = {
      field,
      column: null,
      confidence: "none",
      because: null,
      alternatives: [],
    };
  }

  // A column claimed by two fields.
  //
  // Bybit is the case that forced this: its symbol column is headed
  // "Contracts", which is also what several platforms call quantity. The
  // header alone cannot separate them, so the column's own values do — a
  // column of "BTCUSDT" is text and cannot be a size, a column of "0.02" is
  // a number and cannot be a ticker.
  //
  // The loser then retries its own alternatives instead of giving up, which
  // is what the first version got wrong: size lost "Contracts" to ticker and
  // abandoned the "Qty" column it had also matched, so a mapped file came out
  // with no size at all.
  const collisions: Mapping["collisions"] = [];

  const resolveCollisions = () => {
    const byColumn = new Map<number, TradeField[]>();
    for (const field of TRADE_FIELD_KEYS) {
      const col = matches[field].column;
      if (col === null) continue;
      byColumn.set(col, [...(byColumn.get(col) ?? []), field]);
    }

    let changed = false;

    for (const [column, fields] of byColumn) {
      if (fields.length < 2) continue;
      if (!collisions.some((c) => c.column === column)) {
        collisions.push({ column, fields });
      }

      const shape = kinds[column];
      const fits = (f: TradeField) => {
        const kind = TRADE_FIELDS[f].kind;
        if (shape === "empty" || shape === "text") return kind === "text" || kind === "direction";
        if (shape === "number") return kind === "number";
        if (shape === "date") return kind === "date";
        if (shape === "direction") return kind === "direction";
        return true;
      };

      // Shape first, then header confidence. A field whose kind cannot hold
      // this column's values is wrong however well its header matched.
      const ranked = [...fields].sort((a, b) => {
        const byShape = Number(fits(b)) - Number(fits(a));
        if (byShape !== 0) return byShape;
        return RANK[matches[b].confidence] - RANK[matches[a].confidence];
      });

      const winner = ranked[0];

      for (const field of ranked.slice(1)) {
        const taken = new Set(
          TRADE_FIELD_KEYS.map((f) => (f === field ? null : matches[f].column)).filter(
            (c): c is number => c !== null,
          ),
        );
        const fallback = matches[field].alternatives.find(
          (i) => !taken.has(i) && i !== column,
        );

        matches[field] = fallback !== undefined
          ? {
              ...matches[field],
              column: fallback,
              confidence: "strong",
              because: `Header "${headers[fallback]}" — "${headers[column]}" went to ${TRADE_FIELDS[winner].label}`,
              alternatives: matches[field].alternatives.filter((i) => i !== fallback),
            }
          : {
              ...matches[field],
              column: null,
              confidence: "none",
              because: `"${headers[column]}" was taken by ${TRADE_FIELDS[winner].label}`,
              alternatives: [column],
            };
        changed = true;
      }

      if (MUTUALLY_EXCLUSIVE.some((pair) => pair.every((f) => fields.includes(f)))) {
        matches[winner] = { ...matches[winner], confidence: "weak" };
      }
    }

    return changed;
  };

  // A fallback can itself collide, so this settles rather than runs once.
  // Bounded by the field count, which is the most reassignments possible.
  for (let pass = 0; pass < TRADE_FIELD_KEYS.length && resolveCollisions(); pass++);

  const claimed = new Set(
    TRADE_FIELD_KEYS.map((f) => matches[f].column).filter((c): c is number => c !== null),
  );

  return {
    matches,
    unmatched: headers.map((_, i) => i).filter((i) => !claimed.has(i)),
    missingRequired: TRADE_FIELD_KEYS.filter(
      (f) => TRADE_FIELDS[f].required && matches[f].column === null,
    ),
    collisions,
  };
}

/** Only `exact` is trusted enough to pre-select without the user looking. */
export function autoSelected(mapping: Mapping): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const field of TRADE_FIELD_KEYS) {
    const m = mapping.matches[field];
    out[field] = m.confidence === "exact" ? m.column : null;
  }
  return out;
}
