// Run with: npm run test:csv

import { parseCsvText, CsvError } from "../../features/import/lib/csv-parser.ts";

let fails = 0;
const check = (name: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n        got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`}`);
};
const yes = (name: string, cond: boolean) => check(name, cond, true);
const throws = (name: string, fn: () => unknown) => {
  try {
    fn();
    check(name, "no error", "a CsvError");
  } catch (e) {
    yes(name, e instanceof CsvError);
  }
};

console.log("\n--- delimiters ---");
check("comma", parseCsvText("Symbol,Side\nEURUSD,buy").delimiter, ",");
// A European export uses semicolons precisely because the comma is its
// decimal mark, so these two travel together.
check("semicolon", parseCsvText("Symbol;Side;Entry\nEURUSD;buy;1,0842").delimiter, ";");
check("tab", parseCsvText("Symbol\tSide\nEURUSD\tbuy").delimiter, "\t");
check("pipe", parseCsvText("Symbol|Side\nEURUSD|buy").delimiter, "|");
check(
  "semicolon file keeps its decimal commas intact",
  parseCsvText("Symbol;Entry\nEURUSD;1,0842").rows[0][1],
  "1,0842",
);

console.log("\n--- encoding and whitespace ---");
check("a BOM is stripped from the first header", parseCsvText("﻿Symbol,Side\nEURUSD,buy").headers[0], "Symbol");
check("cells are trimmed", parseCsvText("Symbol,Side\n  EURUSD  ,  buy  ").rows[0], ["EURUSD", "buy"]);
check("CRLF", parseCsvText("Symbol,Side\r\nEURUSD,buy\r\n").rows[0], ["EURUSD", "buy"]);
check("blank lines are skipped", parseCsvText("Symbol,Side\n\nEURUSD,buy\n\n\nGBPUSD,sell\n").rows.length, 2);

console.log("\n--- quoting ---");
{
  const p = parseCsvText('Symbol,Notes\nEURUSD,"swept the low, then reclaimed"');
  check("a quoted comma stays in the value", p.rows[0][1], "swept the low, then reclaimed");
}
{
  const p = parseCsvText('Symbol,Notes\nEURUSD,"line one\nline two"');
  check("an embedded newline stays in the value", p.rows[0][1], "line one\nline two");
  check("and does not become a second row", p.rows.length, 1);
}

console.log("\n--- headers ---");
check(
  "odd characters survive",
  parseCsvText("S / L,T / P,P&L %\n1,2,3").headers,
  ["S / L", "T / P", "P&L %"],
);
check("an empty header gets a name", parseCsvText("Symbol,,Side\nEURUSD,x,buy").headers[1], "Column 2");

console.log("\n--- ragged rows ---");
{
  // A trailing empty field is routinely omitted by exporters. The row is
  // still a row, so it is padded rather than thrown away.
  const p = parseCsvText("Symbol,Side,Notes\nEURUSD,buy");
  check("a short row is padded", p.rows[0], ["EURUSD", "buy", ""]);
  check("and is not reported as a problem", p.issues.length, 0);
}
{
  // More cells than headers usually means an unquoted delimiter inside a
  // value, which silently shifts every column after it. Worth saying.
  const p = parseCsvText("Symbol,Side\nEURUSD,buy,extra");
  yes("a long row is reported", p.issues.some((i) => /3 values but the header has 2/.test(i.message)));
  yes("with the spreadsheet line number", p.issues.some((i) => i.line === 2));
}

console.log("\n--- files that cannot be read ---");
throws("empty", () => parseCsvText(""));
throws("whitespace only", () => parseCsvText("   \n  \n"));
throws("header but no data", () => parseCsvText("Symbol,Side"));
throws("a single column (unknown delimiter)", () => parseCsvText("Symbol~Side\nEURUSD~buy"));

console.log("\n--- nothing is coerced ---");
{
  // If Papa were allowed to type these, 1.085 would become a number using
  // its own assumptions and the original text — the only evidence of the
  // column's convention — would be gone before the detector ever saw it.
  const p = parseCsvText("Entry,Size,When\n1.085,0.10,2026-04-03");
  check("every cell is still a string", p.rows[0].map((c) => typeof c), ["string", "string", "string"]);
  check("and unchanged", p.rows[0], ["1.085", "0.10", "2026-04-03"]);
}

console.log(fails === 0 ? "\nALL CSV PARSER CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
if (fails > 0) process.exitCode = 1;
