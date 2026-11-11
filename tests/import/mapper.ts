// Run with: npm run test:mapper
//
// Column detection against the headers the real platforms actually emit.
// These header rows are taken from the export formats the brief names, so a
// regression here is a platform that stops importing.

import { mapColumns, autoSelected } from "../../features/import/lib/column-mapper.ts";
import { normaliseHeader } from "../../features/import/lib/column-aliases.ts";

let fails = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`,
  );
};
const yes = (name: string, cond: boolean) => check(name, cond, true);

/** Which header a field resolved to, by name, for readable assertions. */
const got = (headers: string[], rows: string[][]) => {
  const m = mapColumns(headers, rows);
  return (field: string) => {
    const col = m.matches[field as keyof typeof m.matches]?.column;
    return col === null || col === undefined ? null : headers[col];
  };
};

console.log("\n--- header normalisation ---");
check("case and spaces", normaliseHeader("Open Price"), "openprice");
check("underscores", normaliseHeader("open_price"), "openprice");
check("units in brackets", normaliseHeader("Price (USD)"), "price");
check("a BOM on the first header", normaliseHeader("﻿Symbol"), "symbol");
check("punctuation", normaliseHeader("P/L %"), "pl");

console.log("\n--- MetaTrader 4/5 ---");
{
  const headers = ["Ticket", "Open Time", "Type", "Size", "Symbol", "Price", "S / L", "T / P", "Close Time", "Price", "Commission", "Swap", "Profit"];
  const rows = [["123", "2026.04.03 14:22", "buy", "0.10", "EURUSD", "1.08420", "1.08180", "1.09180", "2026.04.03 18:02", "1.09180", "-0.80", "0.00", "76.00"]];
  const f = got(headers, rows);
  check("symbol", f("ticker"), "Symbol");
  check("direction", f("direction"), "Type");
  check("size", f("size"), "Size");
  check("commission", f("commission"), "Commission");
  check("swap", f("swap"), "Swap");
  check("pnl", f("pnl"), "Profit");
  check("opened_at", f("opened_at"), "Open Time");
  check("closed_at", f("closed_at"), "Close Time");
  check("stop loss", f("stop_loss"), "S / L");
  check("take profit", f("take_profit"), "T / P");
  // Two columns are literally called "Price". Entry takes the first; exit
  // must NOT silently take the same one.
  const m = mapColumns(headers, rows);
  yes("duplicate Price headers do not map one column to both",
    m.matches.entry.column !== m.matches.exit_price.column ||
    m.matches.exit_price.column === null);
}

console.log("\n--- Binance ---");
{
  const headers = ["Date(UTC)", "Pair", "Side", "Price", "Executed", "Amount", "Fee"];
  const rows = [["2026-04-03 14:22:11", "BTCUSDT", "BUY", "71400.00", "0.015", "1071.00", "0.53"]];
  const f = got(headers, rows);
  check("pair -> ticker", f("ticker"), "Pair");
  check("side -> direction", f("direction"), "Side");
  check("price -> entry", f("entry"), "Price");
  check("fee -> commission", f("commission"), "Fee");
  check("date -> opened_at", f("opened_at"), "Date(UTC)");
}

console.log("\n--- Bybit ---");
{
  const headers = ["Contracts", "Order Type", "Closed P&L", "Avg Entry Price", "Avg Exit Price", "Qty", "Trade Time"];
  const rows = [["BTCUSDT", "Sell", "-120.40", "71400", "71920", "0.02", "2026-04-03 14:22:11"]];
  const f = got(headers, rows);
  check("contracts -> ticker", f("ticker"), "Contracts");
  check("avg entry", f("entry"), "Avg Entry Price");
  check("avg exit", f("exit_price"), "Avg Exit Price");
  check("qty -> size", f("size"), "Qty");
}

console.log("\n--- TradingView-ish / generic ---");
{
  const headers = ["Symbol", "Side", "Entry Price", "Exit Price", "Stop Loss", "Take Profit", "Quantity", "Net P&L", "Entry Time", "Exit Time", "Timeframe", "Setup", "Comment"];
  const rows = [["XAUUSD", "Long", "2438.50", "2454.80", "2434.40", "2455.00", "1", "1630.00", "2026-04-03 07:00", "2026-04-03 11:15", "15m", "London breakout", "clean sweep"]];
  const f = got(headers, rows);
  for (const [field, header] of [
    ["ticker", "Symbol"], ["direction", "Side"], ["entry", "Entry Price"],
    ["exit_price", "Exit Price"], ["stop_loss", "Stop Loss"],
    ["take_profit", "Take Profit"], ["size", "Quantity"], ["pnl", "Net P&L"],
    ["opened_at", "Entry Time"], ["closed_at", "Exit Time"],
    ["timeframe", "Timeframe"], ["strategy", "Setup"], ["notes", "Comment"],
  ] as const) {
    check(`${field} -> ${header}`, f(field), header);
  }
  const m = mapColumns(headers, rows);
  check("nothing required is missing", m.missingRequired, []);
  check("no columns left unclaimed", m.unmatched, []);
}

console.log("\n--- when the header is no help ---");
{
  // Headers that say nothing. Only the direction column is identifiable, and
  // only because its values are a closed set.
  const headers = ["col1", "col2", "col3"];
  const rows = [["EURUSD", "buy", "1.0842"], ["GBPUSD", "sell", "1.2710"]];
  const m = mapColumns(headers, rows);
  check("direction is found by its values", m.matches.direction.column, 1);
  check("and only weakly", m.matches.direction.confidence, "weak");
  // A column of numbers could be any of six price fields. Refusing to choose
  // is the correct behaviour, not a gap.
  check("a bare number column is not guessed at", m.matches.entry.column, null);
  yes("so the symbol is reported missing", m.missingRequired.includes("ticker"));
}

console.log("\n--- only exact matches are pre-selected ---");
{
  const headers = ["Symbol", "Side", "openpricecurrency"];
  const rows = [["EURUSD", "buy", "1.0842"]];
  const m = mapColumns(headers, rows);
  const auto = autoSelected(m);
  check("an exact header is pre-selected", auto.ticker, 0);
  yes(
    "a non-exact match is offered but not pre-selected",
    m.matches.entry.confidence !== "exact" ? auto.entry === null : true,
  );
}

console.log("\n--- required fields gate the import ---");
{
  const m = mapColumns(["Price", "Qty"], [["1.08", "1"]]);
  check("symbol and direction are both required", m.missingRequired, ["ticker", "direction"]);
}

console.log(fails === 0 ? "\nALL MAPPER CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
if (fails > 0) process.exitCode = 1;
