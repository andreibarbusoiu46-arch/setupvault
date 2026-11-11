/**
 * What the internal fields are called in everybody else's export.
 *
 * Matching is by header name first because that is what the file actually
 * tells us. The lists below are deliberately long and deliberately literal:
 * a dictionary is cheap, and every entry here is one fewer column the user
 * has to map by hand.
 *
 * Two fields in `setups` are NOT in this dictionary and cannot be, because no
 * broker export carries them, yet the table requires both:
 *
 *   `title`  — every setup has a name. Derived.
 *   `market` — a required enum. Inferred from the symbol.
 *
 * They are handled in the normaliser rather than mapped, and the user can
 * override the inference. Discovering them late is exactly the kind of thing
 * the brief's "do not assume the schema matches the examples" is about.
 */

/** The fields an import can fill. Keys are internal, not CSV, names. */
export const TRADE_FIELDS = {
  ticker: { label: "Symbol", required: true, kind: "text" },
  direction: { label: "Direction", required: true, kind: "direction" },
  entry: { label: "Entry price", required: false, kind: "number" },
  exit_price: { label: "Exit price", required: false, kind: "number" },
  stop_loss: { label: "Stop loss", required: false, kind: "number" },
  take_profit: { label: "Take profit", required: false, kind: "number" },
  size: { label: "Position size", required: false, kind: "number" },
  pnl: { label: "P&L", required: false, kind: "number" },
  commission: { label: "Commission", required: false, kind: "number" },
  swap: { label: "Swap", required: false, kind: "number" },
  opened_at: { label: "Opened at", required: false, kind: "date" },
  closed_at: { label: "Closed at", required: false, kind: "date" },
  timeframe: { label: "Timeframe", required: false, kind: "text" },
  strategy: { label: "Strategy", required: false, kind: "text" },
  notes: { label: "Notes", required: false, kind: "text" },
} as const;

export type TradeField = keyof typeof TRADE_FIELDS;

export const TRADE_FIELD_KEYS = Object.keys(TRADE_FIELDS) as TradeField[];

/**
 * Header aliases, normalised the same way incoming headers are.
 *
 * Order matters within a field: earlier entries are preferred when one
 * header could serve two fields.
 */
export const ALIASES: Record<TradeField, string[]> = {
  ticker: [
    "symbol", "pair", "instrument", "asset", "market", "contract", "ticker",
    "currencypair", "securities", "product", "coin", "tradingpair", "item",
  ],
  direction: [
    "direction", "side", "type", "position", "tradetype", "ordertype",
    "buysell", "longshort", "action", "positionside", "ordersidename",
  ],
  entry: [
    "entry", "entryprice", "openprice", "averageentry", "avgentry", "priceopen",
    "openrate", "entryrate", "fillprice", "avgfillprice", "price", "openavg",
  ],
  exit_price: [
    "exit", "exitprice", "closeprice", "averageexit", "avgexit", "priceclose",
    "closerate", "exitrate", "settlementprice", "closeavg",
  ],
  stop_loss: ["sl", "stoploss", "stopprice", "stop", "slprice", "stoplossprice"],
  take_profit: [
    "tp", "takeprofit", "targetprice", "target", "tpprice", "takeprofitprice",
    "limitprice",
  ],
  size: [
    "volume", "quantity", "lots", "size", "amount", "qty", "contracts",
    "units", "positionsize", "filledquantity", "executedqty", "lotsize",
  ],
  pnl: [
    "pnl", "profit", "netprofit", "realizedpnl", "realisedpnl", "pl",
    "grossprofit", "profitloss", "netpl", "result", "gain", "realizedprofit",
    "closedpnl",
  ],
  commission: ["commission", "fee", "tradingfee", "fees", "comm", "feespaid"],
  swap: ["swap", "funding", "financing", "rollover", "interest", "fundingfee"],
  opened_at: [
    "opentime", "entrytime", "opendate", "timestamp", "time", "date",
    "datetime", "openedat", "createdat", "tradedate", "transactiontime",
    "entrydate", "opened", "orderdate",
  ],
  closed_at: [
    "closetime", "exittime", "closedate", "closedat", "exitdate", "closed",
    "settlementdate", "updatetime",
  ],
  timeframe: ["timeframe", "interval", "period", "tf", "resolution", "chartperiod"],
  strategy: ["strategy", "setup", "system", "playbook", "play", "method", "model"],
  notes: ["notes", "note", "comment", "comments", "remark", "remarks", "description", "reason"],
};

/**
 * Reduces a header to its comparable core.
 *
 * Case, spaces, underscores, punctuation and bracketed units all vary between
 * exports and none of them carry meaning: "Open Price", "open_price",
 * "OpenPrice" and "Open Price (USD)" are one column.
 */
export function normaliseHeader(header: string): string {
  return String(header)
    .replace(/﻿/g, "") // a BOM on the first header of the file
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // trailing units: "price (usd)"
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Fields that must never be auto-mapped to the same column as each other.
 *
 * `price` is the sharp case: on many exports it is the entry, but on a
 * fills-level export there is one `price` column per side, and silently
 * treating it as both entry and exit would fabricate a round trip out of a
 * single fill.
 */
export const MUTUALLY_EXCLUSIVE: ReadonlyArray<readonly TradeField[]> = [
  ["entry", "exit_price"],
  ["opened_at", "closed_at"],
  ["pnl", "size"],
];
