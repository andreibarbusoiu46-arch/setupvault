// Run with: npm run test:normalizer
//
// A mapped CSV row turning into an insertable setup, including the three
// values the table requires and no export carries.

import { mapColumns, autoSelected } from "../../features/import/lib/column-mapper.ts";
import {
  fingerprint,
  normaliseRows,
  type FieldMapping,
} from "../../features/import/lib/trade-normalizer.ts";
import { inferMarket } from "../../features/import/lib/market.ts";

let fails = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`,
  );
};
const yes = (name: string, cond: boolean) => check(name, cond, true);

console.log("\n--- market inference ---");
for (const [symbol, market] of [
  ["EURUSD", "forex"], ["GBPJPY", "forex"], ["EUR/USD", "forex"],
  ["BTCUSDT", "crypto"], ["ETHUSDC", "crypto"], ["SOLUSDT", "crypto"],
  ["BTCUSD-PERP", "crypto"],
  ["XAUUSD", "commodities"], ["USOIL", "commodities"],
  ["NAS100", "indices"], ["GER40", "indices"], ["US30", "indices"],
  ["AAPL", "stocks"],
] as const) {
  check(`${symbol} -> ${market}`, inferMarket(symbol).market, market);
}
yes("a known pair is confident", inferMarket("EURUSD").confident);
yes("a bare equity ticker is not", !inferMarket("AAPL").confident);
yes("gibberish is not", !inferMarket("ZZQQ99").confident);

console.log("\n--- a MetaTrader export, end to end ---");
{
  const headers = ["Ticket", "Open Time", "Type", "Size", "Symbol", "Price", "S / L", "T / P", "Close Time", "Commission", "Swap", "Profit"];
  const rows = [
    ["1", "03.04.2026 07:00", "buy", "0.10", "XAUUSD", "2438.50", "2434.40", "2454.80", "03.04.2026 11:15", "-0.80", "0.00", "163.00"],
    ["2", "04.04.2026 09:30", "sell", "0.20", "EURUSD", "1.08420", "1.08700", "1.07900", "04.04.2026 10:02", "-1.60", "0.00", "-56.00"],
    ["3", "25.04.2026 14:00", "buy", "1.00", "NAS100", "30080.00", "", "", "", "0.00", "0.00", ""],
  ];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "stocks" });

  check("all three rows are valid", out.counts.valid, 3);
  check("none invalid", out.counts.invalid, 0);

  const [a, b, c] = out.rows.map((r) => r.trade!);

  // Dates: 25.04 in row 3 proves dmy for the whole column, which is what
  // lets rows 1 and 2 be read correctly too.
  check("date order was settled from the column", out.conventions.dates.opened_at.order, "dmy");
  check("opened_at", a.opened_at, "2026-04-03T07:00:00.000Z");
  check("closed_at", a.closed_at, "2026-04-03T11:15:00.000Z");

  // The three derived values.
  check("title is generated", a.title, "XAUUSD · long · 3 Apr 2026");
  check("market is inferred", a.market, "commodities");
  check("result comes from the PnL sign", a.result, "win");
  check("a negative PnL is a loss", b.result, "loss");
  check("no PnL and still open is pending", c.result, "pending");

  // The score and analytics read these, not the timestamps.
  check("traded_on is derived for the score", a.traded_on, "2026-04-03");
  check("traded_at too", a.traded_at, "07:00:00");

  // R multiple from the levels.
  check("risk/reward is computed", a.risk_reward, 3.98);
  check("and is null without levels", c.risk_reward, null);

  check("numbers parsed", [a.entry, a.stop_loss, a.take_profit], [2438.5, 2434.4, 2454.8]);
  check("size", a.size, 0.1);
  check("commission keeps its sign", a.commission, -0.8);
  check("empty cells are null, not zero", [c.stop_loss, c.take_profit, c.pnl], [null, null, null]);
  check("short direction", b.direction, "short");
  check("market for EURUSD", b.market, "forex");
}

console.log("\n--- rows that must not be silently dropped ---");
{
  const headers = ["Symbol", "Side", "Entry", "Open Time"];
  const rows = [
    ["EURUSD", "buy", "1.0842", "2026-04-03 07:00"],
    ["", "buy", "1.0842", "2026-04-03 07:00"],          // no symbol
    ["EURUSD", "flat", "1.0842", "2026-04-03 07:00"],   // unreadable direction
    ["EURUSD", "buy", "banana", "2026-04-03 07:00"],    // unreadable price
    ["", "", "", ""],                                    // genuinely blank
  ];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });

  check("one valid", out.counts.valid, 1);
  check("three invalid", out.counts.invalid, 3);
  check("one blank row ignored without complaint", out.counts.blank, 1);
  // Each bad row still comes back, carrying why.
  yes("the symbol-less row says so", out.rows[1].issues.some((i) => i.message === "No symbol"));
  yes("the direction row says so", out.rows[2].issues.some((i) => /direction/i.test(i.message)));
  yes("the price row says so", out.rows[3].issues.some((i) => /Not a number/.test(i.message)));
  yes("every invalid row is reported, not discarded", out.rows.filter((r) => !r.valid && r.issues.length).length === 3);
}

console.log("\n--- ambiguity is a warning, not a silent guess ---");
{
  // Every date fits both readings, so the column cannot be settled.
  const headers = ["Symbol", "Side", "Entry", "Open Time"];
  const rows = [
    ["EURUSD", "buy", "1,085", "03/04/2026"],
    ["EURUSD", "buy", "1,250", "01/02/2026"],
  ];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });

  yes("the row still imports", out.rows[0].valid);
  yes(
    "but carries a date warning",
    out.rows[0].issues.some((i) => i.severity === "warning" && /day and month/i.test(i.message)),
  );
  yes(
    "and a decimal warning",
    out.rows[0].issues.some((i) => i.severity === "warning" && /decimal/i.test(i.message)),
  );

  // The user's choice overrides the detection.
  const forced = normaliseRows(rows, {
    mapping,
    fallbackMarket: "forex",
    dateOrderOverride: "mdy",
    decimalOverride: ",",
  });
  check("an override is applied", forced.rows[0].trade!.opened_at, "2026-03-04T00:00:00.000Z");
  check("and to the decimal mark", forced.rows[0].trade!.entry, 1.085);
  yes("warnings clear once it is settled", !forced.rows[0].issues.some((i) => i.severity === "warning"));
}

console.log("\n--- wrong geometry imports with a warning ---");
{
  // A stop above entry on a long is a real trade someone really made.
  // Refusing it would be the importer deciding what counts as a trade.
  const headers = ["Symbol", "Side", "Entry", "Stop Loss", "Open Time"];
  const rows = [["EURUSD", "buy", "1.0842", "1.0900", "2026-04-03 07:00"]];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });

  yes("it imports", out.rows[0].valid);
  yes("with a warning", out.rows[0].issues.some((i) => /wrong side/.test(i.message)));
  check("and no R multiple", out.rows[0].trade!.risk_reward, null);
}

console.log("\n--- the date a trade is filed under ---");
{
  // Measured against the real database: a row with a null traded_on is
  // invisible in every date range and absent from the calendar. Some exports
  // carry only a close time, so the fallback is what keeps those findable.
  const headers = ["Symbol", "Side", "Entry", "Close Time"];
  const rows = [["EURUSD", "buy", "1.0842", "2026-04-03 11:15"]];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });
  const t = out.rows[0].trade!;

  check("with no open time, traded_on falls back to the close", t.traded_on, "2026-04-03");
  check("and traded_at with it", t.traded_at, "11:15:00");
  check("opened_at stays honestly null", t.opened_at, null);
}
{
  // No date at all: it still imports, but the user is told it will be
  // unfindable rather than discovering that afterwards.
  const headers = ["Symbol", "Side", "Entry"];
  const rows = [["EURUSD", "buy", "1.0842"]];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });

  yes("a dateless row still imports", out.rows[0].valid);
  check("but has no traded_on", out.rows[0].trade!.traded_on, null);
  yes(
    "and says it will not be findable",
    out.rows[0].issues.some(
      (i) => i.severity === "warning" && /calendar|date range/i.test(i.message),
    ),
  );
}

console.log("\n--- fingerprints ---");
{
  const a = fingerprint("EURUSD", "long", 1.0842, "2026-04-03T07:00:00.000Z");
  check("EUR/USD and EURUSD are one trade", fingerprint("EUR/USD", "long", 1.0842, "2026-04-03T07:00:00.000Z"), a);
  check("1.084200 and 1.0842 are one trade", fingerprint("EURUSD", "long", 1.08420, "2026-04-03T07:00:00.000Z"), a);
  check("seconds do not matter", fingerprint("EURUSD", "long", 1.0842, "2026-04-03T07:00:45.000Z"), a);
  yes("a different direction is a different trade", fingerprint("EURUSD", "short", 1.0842, "2026-04-03T07:00:00.000Z") !== a);
  yes("a different entry is a different trade", fingerprint("EURUSD", "long", 1.0843, "2026-04-03T07:00:00.000Z") !== a);
  yes("a different minute is a different trade", fingerprint("EURUSD", "long", 1.0842, "2026-04-03T07:01:00.000Z") !== a);
}

console.log("\n--- duplicates within one file ---");
{
  const headers = ["Symbol", "Side", "Entry", "Open Time"];
  const rows = [
    ["EURUSD", "buy", "1.0842", "2026-04-03 07:00"],
    ["EURUSD", "buy", "1.0842", "2026-04-03 07:00"], // the same fill again
    ["GBPUSD", "buy", "1.2710", "2026-04-03 08:00"],
  ];
  const mapping = autoSelected(mapColumns(headers, rows)) as FieldMapping;
  const out = normaliseRows(rows, { mapping, fallbackMarket: "forex" });

  check("the repeat is counted", out.counts.duplicatesInFile, 2);
  check("one fingerprint is repeated", out.repeatedInFile.size, 1);
  check("all three still parse", out.counts.valid, 3);
}

console.log(fails === 0 ? "\nALL NORMALIZER CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
if (fails > 0) process.exitCode = 1;
