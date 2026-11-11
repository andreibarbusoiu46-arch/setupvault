// Run with: npm run test:import
//
// The numeric and date normalisation, which is where a CSV importer either
// preserves someone's trading history or quietly corrupts it.
//
// Every case in the brief appears here, plus the ones the brief implies: the
// values that cannot be read from a single cell, and which must therefore be
// reported rather than guessed.

import {
  detectDateConvention,
  detectNumberConvention,
  parseDate,
  parseDirection,
  parseNumber,
  type DateConvention,
  type NumberConvention,
} from "../../features/import/lib/conventions.ts";

let fails = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got      ${JSON.stringify(actual)}\n        expected ${JSON.stringify(expected)}`}`,
  );
};
const yes = (name: string, cond: boolean) => check(name, cond, true);

/** A column whose convention is known, for testing parse in isolation. */
const dot: NumberConvention = { decimal: ".", decided: true, evidence: null, conflict: false };
const comma: NumberConvention = { decimal: ",", decided: true, evidence: null, conflict: false };
const num = (raw: string, c = dot) => parseNumber(raw, c).value;

console.log("\n--- numbers: the shapes the brief lists ---");
check("$120.50", num("$120.50"), 120.5);
check("€120,50 (comma decimal)", num("€120,50", comma), 120.5);
check("1,250.50 (US)", num("1,250.50"), 1250.5);
check("1.250,50 (EU)", num("1.250,50", comma), 1250.5);
check("plain integer", num("1250"), 1250);
check("negative", num("-42.5"), -42.5);
check("accounting negative", num("(1,250.50)"), -1250.5);
check("trailing minus", num("42.5-"), -42.5);
check("whitespace and currency", num("  $ 1,250.50  "), 1250.5);
check("non-breaking space as grouping", num("1 250,50", comma), 1250.5);
check("empty is absent, not zero", num(""), null);
check("null is absent", parseNumber(null, dot).value, null);
check("a dash is not a number", parseNumber("—", dot).value, null);
yes("letters are reported", parseNumber("n/a", dot).issue !== null);

console.log("\n--- numbers: deciding a column's convention ---");
// Both separators in one value settle it outright.
check(
  "1.234,56 proves comma-decimal",
  detectNumberConvention(["1.234,56"]).decimal,
  ",",
);
check(
  "1,234.56 proves period-decimal",
  detectNumberConvention(["1,234.56"]).decimal,
  ".",
);
// A separator followed by something other than three digits is a decimal.
check("1,5 proves comma-decimal", detectNumberConvention(["1,5"]).decimal, ",");
check(
  "1.08534 proves period-decimal",
  detectNumberConvention(["1.08534"]).decimal,
  ".",
);
// A repeated separator must be grouping.
check(
  "1.234.567 proves comma-decimal",
  detectNumberConvention(["1.234.567"]).decimal,
  ",",
);

{
  // THE case this module exists for. One value, one separator, exactly three
  // digits after it: 1,085 is 1085 in New York and 1.085 in Frankfurt, and
  // the string does not say which.
  const c = detectNumberConvention(["1,085", "1,250", "2,400"]);
  yes("a column of only N,NNN is undecided", !c.decided);
  yes("and is not reported as a conflict", !c.conflict);
}
{
  // One decisive value anywhere in the column settles the whole column —
  // which is the entire reason this is decided per column and not per cell.
  const c = detectNumberConvention(["1,085", "1,250", "0,5"]);
  yes("one decisive value settles the column", c.decided);
  check("and it is read as comma-decimal", c.decimal, ",");
  check("evidence names the value", c.evidence, "0,5");
  // With that convention, the ambiguous siblings now read correctly.
  check("so 1,085 becomes 1.085", num("1,085", c), 1.085);
}
{
  const c = detectNumberConvention(["1.085", "1,234.56"]);
  check("a mixed-but-consistent column decides", c.decided, true);
  check("and 1.085 is 1.085", num("1.085", c), 1.085);
}
{
  // Genuinely contradictory: one value says comma-decimal, another says
  // period-decimal. One column cannot be both.
  const c = detectNumberConvention(["1.234,56", "1,234.56"]);
  yes("contradictory evidence is a conflict", c.conflict);
  yes("and is not treated as decided", !c.decided);
}
{
  const c = detectNumberConvention(["100", "250", "1250"]);
  yes("a column with no separators needs no decision", c.decided);
}

console.log("\n--- dates: deciding day-vs-month from the column ---");
check("ISO is ymd", detectDateConvention(["2026-04-03"]).order, "ymd");
check(
  "a first field above 12 proves dmy",
  detectDateConvention(["03/04/2026", "25/12/2026"]).order,
  "dmy",
);
check(
  "a second field above 12 proves mdy",
  detectDateConvention(["04/03/2026", "12/25/2026"]).order,
  "mdy",
);
{
  // The brief's own example. Every value fits both readings, so nothing in
  // the file can settle it and the user has to say.
  const c = detectDateConvention(["03/04/2026", "01/02/2026", "05/06/2026"]);
  yes("a column where every date fits both is undecided", !c.decided);
  yes("and is not a conflict — the information is simply absent", !c.conflict);
}
{
  const c = detectDateConvention(["25/12/2026", "12/25/2026"]);
  yes("both orders proven in one column is a conflict", c.conflict);
}

console.log("\n--- dates: parsing ---");
const dmy: DateConvention = { order: "dmy", decided: true, evidence: null, conflict: false };
const mdy: DateConvention = { order: "mdy", decided: true, evidence: null, conflict: false };
const iso = (raw: string, c = dmy) => parseDate(raw, c).iso;

check("03/04/2026 as dmy is 3 April", iso("03/04/2026"), "2026-04-03T00:00:00.000Z");
check("03/04/2026 as mdy is 4 March", iso("03/04/2026", mdy), "2026-03-04T00:00:00.000Z");
check("with a time", iso("03/04/2026 14:22"), "2026-04-03T14:22:00.000Z");
check("with seconds", iso("03/04/2026 14:22:11"), "2026-04-03T14:22:11.000Z");
check("dashes", iso("03-04-2026"), "2026-04-03T00:00:00.000Z");
check("dots", iso("03.04.2026"), "2026-04-03T00:00:00.000Z");
check("ISO with Z is taken as given", iso("2026-04-03T14:22:11Z"), "2026-04-03T14:22:11.000Z");
check(
  "an explicit offset is honoured, not ignored",
  iso("2026-04-03T14:22:11+03:00"),
  "2026-04-03T11:22:11.000Z",
);
check("two-digit year", iso("03/04/26"), "2026-04-03T00:00:00.000Z");
check("unix seconds", iso("1775217731"), "2026-04-03T12:02:11.000Z");
check("unix milliseconds", iso("1775217731000"), "2026-04-03T12:02:11.000Z");
check("empty is absent", iso(""), null);
yes("31 February is refused, not rolled forward", parseDate("31/02/2026", dmy).iso === null);
yes("month 13 is refused", parseDate("13/01/2026", mdy).iso === null);
yes("but 01/13 as mdy is simply 13 January", parseDate("01/13/2026", mdy).iso !== null);
yes("25:00 is refused", parseDate("03/04/2026 25:00", dmy).iso === null);
yes("a ticket number is not a date", parseDate("123456789012345", dmy).iso === null);
yes("gibberish is reported", parseDate("not a date", dmy).issue !== null);

console.log("\n--- direction ---");
for (const raw of ["BUY", "buy", "Long", "LONG", "B", "Buy/Long", "open long", "BUY_LIMIT"]) {
  check(`${raw} -> long`, parseDirection(raw).value, "long");
}
for (const raw of ["SELL", "sell", "Short", "SHORT", "Sell/Short", "open short", "SELL STOP"]) {
  check(`${raw} -> short`, parseDirection(raw).value, "short");
}
check("empty is absent", parseDirection("").value, null);
check("unknown is refused", parseDirection("flat").value, null);
yes("and reported", parseDirection("flat").issue !== null);
// The brief is explicit: never guess direction from PnL. There is no code
// path that could, because parseDirection takes only the direction cell —
// this asserts the signature has not grown one.
check("parseDirection takes one argument", parseDirection.length, 1);

console.log(fails === 0 ? "\nALL CONVENTION CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
if (fails > 0) process.exitCode = 1;
