"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import {
  CSV_LIMITS,
  CsvError,
  readCsvFile,
  type ParsedCsv,
} from "@/features/import/lib/csv-parser";
import {
  TRADE_FIELDS,
  TRADE_FIELD_KEYS,
  type TradeField,
} from "@/features/import/lib/column-aliases";
import { autoSelected, mapColumns, type Mapping } from "@/features/import/lib/column-mapper";
import {
  normaliseRows,
  type FieldMapping,
  type NormaliseResult,
} from "@/features/import/lib/trade-normalizer";
import type { MarketType } from "@/types/database";
import type { ImportReport } from "@/services/csv-import.service";

/**
 * The five steps of an import, as one client component.
 *
 * All of the reading happens here, in the browser: the file is parsed, the
 * columns are mapped, the rows are normalised and previewed, and only the
 * finished trades are posted. A 10MB CSV never crosses the wire and the
 * preview updates as fast as a dropdown changes.
 *
 * That is a performance decision, not a trust decision. The server validates
 * every row again — see csv-import.service — because this code is reachable
 * with curl and a browser can be skipped entirely.
 *
 * The one rule the layout follows throughout: the user never advances past
 * something they have not been shown. Ambiguity found in the file is surfaced
 * on the step where it can be fixed, required fields block the Continue
 * button rather than failing later, and the last screen states exactly what
 * will be written before anything is.
 */

const MARKETS: MarketType[] = [
  "forex", "crypto", "stocks", "indices", "futures", "commodities", "options",
];

type Step = "upload" | "map" | "preview" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "File" },
  { id: "map", label: "Columns" },
  { id: "preview", label: "Review" },
  { id: "done", label: "Done" },
];

const fade = {
  initial: { opacity: 0, transform: "translateY(8px)" },
  animate: { opacity: 1, transform: "translateY(0px)" },
  exit: { opacity: 0, transform: "translateY(-6px)" },
  transition: { duration: 0.28, ease: EASE_OUT },
};

export function CsvImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [mapping, setMapping] = useState<FieldMapping>({});
  const [detected, setDetected] = useState<Mapping | null>(null);
  const [fallbackMarket, setFallbackMarket] = useState<MarketType>("forex");
  const [dateOrder, setDateOrder] = useState<"auto" | "dmy" | "mdy">("auto");
  const [decimal, setDecimal] = useState<"auto" | "." | ",">("auto");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [report, setReport] = useState<ImportReport | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Step A: the file ─────────────────────────────────────────────────── */

  const accept = useCallback(async (next: File) => {
    setError(null);
    setBusy(true);
    try {
      const result = await readCsvFile(next);
      const guessed = mapColumns(result.headers, result.rows);
      setFile(next);
      setParsed(result);
      setDetected(guessed);
      setMapping(autoSelected(guessed) as FieldMapping);
      setStep("map");
    } catch (e) {
      setFile(null);
      setParsed(null);
      setError(
        e instanceof CsvError
          ? e.message
          : "That file could not be read. Check that it is a CSV and try again.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setDetected(null);
    setMapping({});
    setReport(null);
    setError(null);
    setDateOrder("auto");
    setDecimal("auto");
    if (inputRef.current) inputRef.current.value = "";
  };

  /* ── Normalisation, recomputed whenever a choice changes ──────────────── */

  const normalised: NormaliseResult | null = useMemo(() => {
    if (!parsed) return null;
    return normaliseRows(parsed.rows, {
      mapping,
      fallbackMarket,
      dateOrderOverride: dateOrder === "auto" ? undefined : dateOrder,
      decimalOverride: decimal === "auto" ? undefined : decimal,
    });
  }, [parsed, mapping, fallbackMarket, dateOrder, decimal]);

  const missingRequired = TRADE_FIELD_KEYS.filter(
    (f) => TRADE_FIELDS[f].required && (mapping[f] === null || mapping[f] === undefined),
  );

  /** Fields pointing at one column, which is usually a mistake. */
  const doubleMapped = useMemo(() => {
    const byColumn = new Map<number, TradeField[]>();
    for (const field of TRADE_FIELD_KEYS) {
      const col = mapping[field];
      if (col === null || col === undefined) continue;
      byColumn.set(col, [...(byColumn.get(col) ?? []), field]);
    }
    return [...byColumn.entries()].filter(([, fields]) => fields.length > 1);
  }, [mapping]);

  /** Columns in the file that nothing is reading. */
  const ignored = useMemo(() => {
    if (!parsed) return [];
    const used = new Set(Object.values(mapping).filter((c): c is number => c !== null && c !== undefined));
    return parsed.headers.map((h, i) => ({ h, i })).filter(({ i }) => !used.has(i));
  }, [parsed, mapping]);

  /** Whether the file left a convention undecided, so we must ask. */
  const undecided = useMemo(() => {
    if (!normalised) return { dates: false, numbers: false };
    return {
      dates: Object.values(normalised.conventions.dates).some((c) => !c.decided),
      numbers: Object.values(normalised.conventions.numbers).some((c) => !c.decided),
    };
  }, [normalised]);

  /* ── Step E: writing ─────────────────────────────────────────────────── */

  const submit = async () => {
    if (!normalised) return;
    setBusy(true);
    setError(null);

    const trades = normalised.rows
      .filter((r) => r.valid && r.trade)
      .map((r) => r.trade!);

    try {
      const response = await fetch("/api/import/csv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trades, skipDuplicates }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "The import failed. Nothing was written.");
        return;
      }
      setReport(payload as ImportReport);
      setStep("done");
    } catch {
      setError("Could not reach the server. Nothing was written.");
    } finally {
      setBusy(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* Progress. A list of where you are, not decoration. */}
      <ol className="mb-8 flex items-center gap-2 text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                i < stepIndex && "bg-positive-soft text-positive",
                i === stepIndex && "bg-accent text-accent-fg",
                i > stepIndex && "border border-border text-fg-subtle",
              )}
            >
              {i < stepIndex ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : i + 1}
            </span>
            <span className={cn(i === stepIndex ? "text-fg" : "text-fg-subtle")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-border sm:w-10" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-negative/30 bg-negative-soft px-4 py-3 text-[14px] text-fg"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-negative" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── A. Upload ───────────────────────────────────────────────── */}
        {step === "upload" && (
          <motion.div key="upload" {...fade}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) void accept(dropped);
              }}
              className={cn(
                "glass-card rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
                dragging ? "border-accent bg-accent-soft" : "border-border",
              )}
            >
              <FileSpreadsheet
                className="mx-auto size-10 text-fg-subtle"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="mt-4 text-[15px] font-medium text-fg">
                Drop a CSV here, or choose a file
              </p>
              <p className="mt-1.5 text-[13px] text-fg-subtle">
                MetaTrader, TradingView, Binance, Bybit, cTrader or any broker
                export. Comma, semicolon or tab delimited. Up to{" "}
                {CSV_LIMITS.maxBytes / 1024 / 1024}MB.
              </p>

              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  if (chosen) void accept(chosen);
                }}
              />
              <Button
                type="button"
                variant="solid"
                className="mt-6"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Reading
                  </>
                ) : (
                  <>
                    <Upload className="size-4" aria-hidden="true" />
                    Choose file
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── B/C. Mapping ────────────────────────────────────────────── */}
        {step === "map" && parsed && detected && (
          <motion.div key="map" {...fade} className="space-y-6">
            <FileChip file={file} parsed={parsed} onRemove={reset} />

            {parsed.issues.length > 0 && (
              <Notice tone="warning" title={`${parsed.issues.length} row problem${parsed.issues.length === 1 ? "" : "s"} while reading the file`}>
                <ul className="mt-1.5 space-y-1">
                  {parsed.issues.slice(0, 5).map((issue, i) => (
                    <li key={i}>
                      {issue.line ? <span className="numeric">Line {issue.line}: </span> : null}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-fg">Match the columns</h2>
                  <p className="mt-1 text-[13px] text-fg-subtle">
                    Exact matches are filled in. Anything uncertain is left for
                    you — a wrong guess that looks right is worse than a blank.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="glass"
                  className="shrink-0 text-[12.5px]"
                  onClick={() => setMapping(autoSelected(detected) as FieldMapping)}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Reset
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {TRADE_FIELD_KEYS.map((field) => {
                  const meta = TRADE_FIELDS[field];
                  const guess = detected.matches[field];
                  const value = mapping[field];
                  const isMissing = meta.required && (value === null || value === undefined);

                  return (
                    <label key={field} className="block">
                      <span className="flex items-baseline gap-1.5 text-[13px] font-medium text-fg">
                        {meta.label}
                        {meta.required && (
                          <span className="text-[11px] font-normal text-negative">required</span>
                        )}
                      </span>
                      <select
                        value={value ?? ""}
                        onChange={(e) =>
                          setMapping((m) => ({
                            ...m,
                            [field]: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        className={cn(
                          "mt-1.5 h-10 w-full rounded-lg border bg-surface-raised px-3 text-[13px] text-fg",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                          isMissing ? "border-negative/50" : "border-border",
                        )}
                      >
                        <option value="">
                          {meta.required ? "— choose a column —" : "— not imported —"}
                        </option>
                        {parsed.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {h}
                          </option>
                        ))}
                      </select>
                      {guess.because && value === guess.column && (
                        <span className="mt-1 block text-[11.5px] text-fg-subtle">
                          {guess.because}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              {doubleMapped.length > 0 && (
                <Notice tone="warning" title="Two fields are reading the same column" className="mt-5">
                  <ul className="mt-1.5 space-y-1">
                    {doubleMapped.map(([col, fields]) => (
                      <li key={col}>
                        <span className="font-medium">{parsed.headers[col]}</span> —{" "}
                        {fields.map((f) => TRADE_FIELDS[f].label).join(" and ")}
                      </li>
                    ))}
                  </ul>
                </Notice>
              )}

              {ignored.length > 0 && (
                <p className="mt-5 text-[12.5px] text-fg-subtle">
                  Not imported: {ignored.map(({ h }) => h).join(", ")}
                </p>
              )}
            </div>

            {/* The two questions the file sometimes cannot answer. */}
            {(undecided.dates || undecided.numbers) && (
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h2 className="text-[15px] font-semibold text-fg">
                  Two things this file does not say
                </h2>
                <p className="mt-1 text-[13px] text-fg-subtle">
                  Every value in these columns reads correctly either way, so
                  the file cannot settle it and guessing would be wrong for
                  every row at once.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {undecided.dates && (
                    <Choice
                      label="Date order"
                      hint="Is 03/04/2026 the 3rd of April, or the 4th of March?"
                      value={dateOrder}
                      onChange={(v) => setDateOrder(v as typeof dateOrder)}
                      options={[
                        { value: "auto", label: "Leave as detected" },
                        { value: "dmy", label: "Day / Month / Year" },
                        { value: "mdy", label: "Month / Day / Year" },
                      ]}
                    />
                  )}
                  {undecided.numbers && (
                    <Choice
                      label="Decimal mark"
                      hint="Is 1,085 one thousand and eighty-five, or 1.085?"
                      value={decimal}
                      onChange={(v) => setDecimal(v as typeof decimal)}
                      options={[
                        { value: "auto", label: "Leave as detected" },
                        { value: ".", label: "1,085.50 — point is decimal" },
                        { value: ",", label: "1.085,50 — comma is decimal" },
                      ]}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <Choice
                label="Market for unrecognised symbols"
                hint="Required by every setup. Recognised symbols are filed automatically; this covers the rest."
                value={fallbackMarket}
                onChange={(v) => setFallbackMarket(v as MarketType)}
                options={MARKETS.map((m) => ({ value: m, label: m }))}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="glass" onClick={reset}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Different file
              </Button>
              <div className="flex items-center gap-3">
                {missingRequired.length > 0 && (
                  <span className="text-[12.5px] text-fg-subtle">
                    Still needed:{" "}
                    {missingRequired.map((f) => TRADE_FIELDS[f].label).join(", ")}
                  </span>
                )}
                <Button
                  type="button"
                  variant="solid"
                  disabled={missingRequired.length > 0}
                  onClick={() => setStep("preview")}
                >
                  Review
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── D/E. Preview and summary ───────────────────────────────── */}
        {step === "preview" && normalised && parsed && (
          <motion.div key="preview" {...fade} className="space-y-6">
            <FileChip file={file} parsed={parsed} onRemove={reset} />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Rows in file" value={normalised.counts.total} />
              <Stat label="Will import" value={normalised.counts.valid} tone="positive" />
              <Stat
                label="Cannot import"
                value={normalised.counts.invalid}
                tone={normalised.counts.invalid > 0 ? "negative" : undefined}
              />
              <Stat
                label="Repeated in file"
                value={normalised.counts.duplicatesInFile}
                tone={normalised.counts.duplicatesInFile > 0 ? "warning" : undefined}
              />
            </div>

            {normalised.counts.warnings > 0 && (
              <Notice
                tone="warning"
                title={`${normalised.counts.warnings} row${normalised.counts.warnings === 1 ? "" : "s"} will import with something worth checking`}
              >
                <p className="mt-1">
                  These are not errors. They are values the file left ambiguous
                  or geometry that looks unusual — worth a glance before you
                  commit them.
                </p>
              </Notice>
            )}

            <PreviewTable result={normalised} />

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-[13px]">
                  <span className="font-medium text-fg">
                    Skip trades already in my library
                  </span>
                  <span className="mt-1 block text-fg-subtle">
                    Matched on symbol, direction, entry and the minute it
                    opened. Turn this off only if you genuinely want a second
                    copy — nothing existing is ever overwritten either way.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="glass" onClick={() => setStep("map")}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Change columns
              </Button>
              <Button
                type="button"
                variant="solid"
                disabled={busy || normalised.counts.valid === 0}
                onClick={() => void submit()}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Importing
                  </>
                ) : (
                  <>
                    Import {normalised.counts.valid}{" "}
                    {normalised.counts.valid === 1 ? "trade" : "trades"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Done ───────────────────────────────────────────────────── */}
        {step === "done" && report && (
          <motion.div key="done" {...fade} className="space-y-6">
            <div className="glass-card rounded-2xl p-6 text-center">
              <CheckCircle2
                className="mx-auto size-10 text-positive"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="stat mt-4 text-[2rem] leading-none text-fg">
                {report.imported}
              </p>
              <p className="mt-1.5 text-[14px] text-fg-muted">
                {report.imported === 1 ? "trade imported" : "trades imported"}
              </p>

              <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3 text-left">
                <Stat label="Already had" value={report.duplicatesSkipped} />
                <Stat label="Repeats in file" value={report.repeatsCollapsed} />
                <Stat
                  label="Failed"
                  value={report.failed}
                  tone={report.failed > 0 ? "negative" : undefined}
                />
              </dl>
            </div>

            {report.failures.length > 0 && (
              <Notice tone="warning" title="These rows were not written">
                <ul className="mt-1.5 space-y-1">
                  {report.failures.map((f, i) => (
                    <li key={i}>
                      <span className="numeric font-medium">{f.ticker || "—"}</span>{" "}
                      — {f.reason}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            <div className="flex items-center justify-center gap-3">
              <Button type="button" variant="glass" onClick={reset}>
                Import another file
              </Button>
              <Button type="button" variant="solid" asChild>
                <Link href={ROUTES.setups}>View my setups</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Pieces ──────────────────────────────────────────────────────────────── */

function FileChip({
  file,
  parsed,
  onRemove,
}: {
  file: File | null;
  parsed: ParsedCsv;
  onRemove: () => void;
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-xl px-4 py-3">
      <FileSpreadsheet className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-fg">
          {file?.name ?? "file.csv"}
        </p>
        <p className="numeric mt-0.5 text-[11.5px] text-fg-subtle">
          {formatBytes(file?.size ?? 0)} ·{" "}
          {parsed.rows.length.toLocaleString("en-GB")} rows ·{" "}
          {parsed.headers.length} columns ·{" "}
          {parsed.delimiter === "\t" ? "tab" : `"${parsed.delimiter}"`} delimited
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove this file"
        className="shrink-0 rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** A small export is a few hundred bytes, and "0 KB" reads as a failure. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: "warning" | "error";
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-[13px] text-fg",
        tone === "warning"
          ? "border-accent/30 bg-accent-soft"
          : "border-negative/30 bg-negative-soft",
        className,
      )}
    >
      <p className="font-medium">{title}</p>
      <div className="text-fg-muted">{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "positive" | "negative" | "warning";
}) {
  return (
    <div className="glass-card rounded-xl px-3 py-2.5">
      <dt className="text-[11px] text-fg-subtle">{label}</dt>
      <dd
        className={cn(
          "stat mt-0.5 text-[1.25rem] leading-none",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          tone === "warning" && "text-accent",
          !tone && "text-fg",
        )}
      >
        {value.toLocaleString("en-GB")}
      </dd>
    </div>
  );
}

function Choice({
  label,
  hint,
  value,
  onChange,
  options,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-fg">{label}</span>
      <span className="mt-1 block text-[12px] text-fg-subtle">{hint}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-border bg-surface-raised px-3 text-[13px] capitalize text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The first five rows, normalised.
 *
 * Normalised, not raw — the brief is specific about that, and it is the whole
 * value of the step: seeing "3 Apr 2026" tells you the date order was read
 * correctly, where seeing "03/04/2026" tells you nothing you did not already
 * know.
 */
function PreviewTable({ result }: { result: NormaliseResult }) {
  const shown = result.rows.filter((r) => r.issues.length > 0 || r.trade).slice(0, 5);

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-[15px] font-semibold text-fg">First rows, as they will be saved</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-[12.5px]">
          <thead className="text-fg-subtle">
            <tr className="border-b border-border">
              {["", "Symbol", "Dir", "Entry", "Exit", "Stop", "Target", "Size", "P&L", "Opened", "Closed"].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shown.map((row) => {
              const t = row.trade;
              const bad = row.issues.some((i) => i.severity === "error");
              const warn = row.issues.some((i) => i.severity === "warning");

              return (
                <tr
                  key={row.line}
                  className={cn(
                    bad && "bg-negative-soft",
                    !bad && warn && "bg-accent-soft/40",
                  )}
                >
                  <td className="px-3 py-2 align-top">
                    <span className="numeric text-fg-subtle">{row.line}</span>
                  </td>
                  {t ? (
                    <>
                      <td className="numeric px-3 py-2 font-medium text-fg">{t.ticker}</td>
                      <td className="px-3 py-2 capitalize text-fg-muted">{t.direction}</td>
                      {([t.entry, t.exit_price, t.stop_loss, t.take_profit, t.size] as const).map(
                        (v, i) => (
                          <td key={i} className="numeric px-3 py-2 text-fg-muted">
                            {v === null ? "—" : v}
                          </td>
                        ),
                      )}
                      <td
                        className={cn(
                          "numeric px-3 py-2",
                          t.pnl === null ? "text-fg-muted" : t.pnl > 0 ? "text-positive" : t.pnl < 0 ? "text-negative" : "text-fg-muted",
                        )}
                      >
                        {t.pnl === null ? "—" : `${t.pnl > 0 ? "+" : ""}${t.pnl}`}
                      </td>
                      <td className="numeric px-3 py-2 text-fg-muted">
                        {t.opened_at
                          ? new Date(t.opened_at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "UTC",
                            })
                          : "—"}
                      </td>
                      <td className="numeric px-3 py-2 text-fg-muted">
                        {t.closed_at
                          ? new Date(t.closed_at).toLocaleString("en-GB", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "UTC",
                            })
                          : "—"}
                      </td>
                    </>
                  ) : (
                    <td colSpan={10} className="px-3 py-2 text-negative">
                      Not imported — {row.issues.map((i) => i.message).join("; ")}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Issues under the table rather than inside it, so a long explanation
          does not stretch a column. */}
      {shown.some((r) => r.issues.length > 0 && r.trade) && (
        <ul className="space-y-1.5 border-t border-border px-5 py-3 text-[12.5px] text-fg-muted">
          {shown
            .filter((r) => r.trade && r.issues.length > 0)
            .flatMap((r) =>
              r.issues.map((issue, i) => (
                <li key={`${r.line}-${i}`} className="flex gap-2">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      issue.severity === "error" ? "text-negative" : "text-accent",
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="numeric">Row {r.line}</span> — {issue.message}
                  </span>
                </li>
              )),
            )}
        </ul>
      )}
    </div>
  );
}
