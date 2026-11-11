import Papa from "papaparse";

/**
 * Reading the file, before anything knows what the columns mean.
 *
 * Papa Parse handles the grammar — quoting, embedded newlines, delimiter
 * sniffing — and this wraps it with the things a trading export specifically
 * does that a general CSV parser has no opinion about.
 *
 * Nothing is discarded quietly. Papa reports its own errors per row and they
 * are carried out of here rather than swallowed, because a file that half
 * parsed is the case where silence does the most damage: the user sees 300
 * rows, imports them, and never learns that 40 were dropped.
 */

export const CSV_LIMITS = {
  /** 10MB. A decade of one account's fills is well under this. */
  maxBytes: 10 * 1024 * 1024,
  maxRows: 5_000,
} as const;

export interface ParseIssue {
  /** 1-based, as a spreadsheet numbers it. Null for file-level problems. */
  line: number | null;
  message: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: string;
  /** Rows Papa could read but flagged, and rows beyond the cap. */
  issues: ParseIssue[];
  /** True when the row cap stopped the read. */
  truncated: boolean;
}

export class CsvError extends Error {}

/**
 * The delimiters worth trying, in order.
 *
 * Semicolon matters more than it looks: a European Excel writes CSV with
 * semicolons precisely because the comma is its decimal mark, so the files
 * most likely to need the number-convention detection are also the ones most
 * likely to be semicolon-delimited.
 */
const DELIMITERS = [",", ";", "\t", "|"];

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsvText(text: string): ParsedCsv {
  const clean = stripBom(text);

  if (!clean.trim()) {
    throw new CsvError("That file is empty.");
  }

  const result = Papa.parse<string[]>(clean, {
    delimiter: "", // sniff
    delimitersToGuess: DELIMITERS,
    skipEmptyLines: "greedy",
    // Everything stays a string. Papa's own type coercion would undo the
    // whole point of the convention detection: it reads 1.085 as a number
    // using its own assumptions, and by then the original text is gone.
    dynamicTyping: false,
    header: false,
    transform: (value) => value.trim(),
  });

  const issues: ParseIssue[] = [];
  for (const error of result.errors) {
    // Papa's `row` is 0-based over data rows; +2 accounts for that and the
    // header, so the number matches what the user sees in a spreadsheet.
    issues.push({
      line: typeof error.row === "number" ? error.row + 2 : null,
      message: error.message,
    });
  }

  const all = (result.data ?? []).filter(
    (row) => Array.isArray(row) && row.some((cell) => cell !== ""),
  );

  if (all.length === 0) {
    throw new CsvError("That file has no readable rows.");
  }

  const [headerRow, ...dataRows] = all;

  const headers = headerRow.map((h, i) => h || `Column ${i + 1}`);

  if (headers.length < 2) {
    throw new CsvError(
      "Only one column was found. The delimiter may not be one this reader recognises — comma, semicolon, tab and pipe are supported.",
    );
  }

  if (dataRows.length === 0) {
    throw new CsvError("That file has a header row but no data.");
  }

  const truncated = dataRows.length > CSV_LIMITS.maxRows;
  if (truncated) {
    issues.push({
      line: CSV_LIMITS.maxRows + 2,
      message: `The file has ${dataRows.length.toLocaleString("en-GB")} rows; only the first ${CSV_LIMITS.maxRows.toLocaleString("en-GB")} were read. Split it and import the rest separately.`,
    });
  }

  // Short rows are padded rather than rejected: a trailing empty field is
  // routinely omitted by exporters, and a row missing its last column is
  // still a row. A row with MORE cells than headers is the interesting case —
  // usually an unquoted delimiter inside a value — so it is reported.
  const width = headers.length;
  const rows = dataRows.slice(0, CSV_LIMITS.maxRows).map((row, i) => {
    if (row.length > width) {
      issues.push({
        line: i + 2,
        message: `This row has ${row.length} values but the header has ${width}. A value may contain an unquoted ${result.meta.delimiter === "\t" ? "tab" : `"${result.meta.delimiter}"`}.`,
      });
    }
    return Array.from({ length: width }, (_, c) => row[c] ?? "");
  });

  return {
    headers,
    rows,
    delimiter: result.meta.delimiter,
    issues,
    truncated,
  };
}

/** Reads a File as text, honouring a UTF-8 BOM. */
export async function readCsvFile(file: File): Promise<ParsedCsv> {
  if (!/\.csv$|\.txt$/i.test(file.name) && file.type && !/csv|text|excel/i.test(file.type)) {
    throw new CsvError(`"${file.name}" is not a CSV file.`);
  }
  if (file.size === 0) {
    throw new CsvError("That file is empty.");
  }
  if (file.size > CSV_LIMITS.maxBytes) {
    throw new CsvError(
      `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${CSV_LIMITS.maxBytes / 1024 / 1024}MB.`,
    );
  }

  const text = await file.text();
  return parseCsvText(text);
}
