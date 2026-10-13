import type { MarketType, TradeDirection, TradeResult } from "@/types/database";

/** The only columns analytics needs. No screenshots, no notes, no tags. */
export interface AnalyticsRow {
  id: string;
  title: string;
  ticker: string;
  traded_on: string | null;
  created_at: string;
  result: TradeResult;
  direction: TradeDirection;
  market: MarketType;
  strategy: string | null;
  entry: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_reward: number | null;
  tags: string[];
  screenshot_path: string | null;
  notes_length: number;
  is_favorite: boolean;
}

export interface Stats {
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
  /** wins / (wins + losses). Null when nothing has resolved — never 0%. */
  winRate: number | null;
  resolved: number;
  avgRiskReward: number | null;
  avgWinRiskReward: number | null;
  avgLossRiskReward: number | null;
}

export interface GroupStats extends Stats {
  key: string;
  label: string;
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Every date in this file is a plain `YYYY-MM-DD` string, the same shape the
 * `traded_on` column stores. Nothing is ever parsed into a local Date and read
 * back, which is where calendars pick up off-by-one-day timezone bugs.
 */
export function setupDate(row: AnalyticsRow): string {
  return row.traded_on ?? row.created_at.slice(0, 10);
}

function toParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** Arithmetic via UTC only, so no local offset can shift the day. */
function shiftDays(date: string, days: number): string {
  const { year, month, day } = toParts(date);
  const utc = Date.UTC(year, month - 1, day + days);
  return new Date(utc).toISOString().slice(0, 10);
}

function dayOfWeek(date: string): number {
  const { year, month, day } = toParts(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/* -------------------------------------------------------------------------- */
/* Core aggregation                                                           */
/* -------------------------------------------------------------------------- */

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 100) / 100;
}

export function computeStats(rows: AnalyticsRow[]): Stats {
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let pending = 0;

  const allRatios: number[] = [];
  const winRatios: number[] = [];
  const lossRatios: number[] = [];

  for (const row of rows) {
    switch (row.result) {
      case "win":
        wins++;
        break;
      case "loss":
        losses++;
        break;
      case "breakeven":
        breakeven++;
        break;
      default:
        pending++;
    }

    const ratio =
      row.risk_reward === null ? null : Number(row.risk_reward);
    if (ratio !== null && Number.isFinite(ratio)) {
      allRatios.push(ratio);
      if (row.result === "win") winRatios.push(ratio);
      if (row.result === "loss") lossRatios.push(ratio);
    }
  }

  const resolved = wins + losses;

  return {
    total: rows.length,
    wins,
    losses,
    breakeven,
    pending,
    resolved,
    // Break-even and unresolved setups are excluded from the denominator on
    // purpose: counting them would quietly deflate every win rate.
    winRate: resolved === 0 ? null : Math.round((wins / resolved) * 1000) / 10,
    avgRiskReward: mean(allRatios),
    avgWinRiskReward: mean(winRatios),
    avgLossRiskReward: mean(lossRatios),
  };
}

function groupBy(
  rows: AnalyticsRow[],
  keyOf: (row: AnalyticsRow) => { key: string; label: string } | null,
): GroupStats[] {
  const buckets = new Map<string, { label: string; rows: AnalyticsRow[] }>();

  for (const row of rows) {
    const identity = keyOf(row);
    if (!identity) continue;

    const existing = buckets.get(identity.key);
    if (existing) existing.rows.push(row);
    else buckets.set(identity.key, { label: identity.label, rows: [row] });
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      ...computeStats(bucket.rows),
    }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function byStrategy(rows: AnalyticsRow[]): GroupStats[] {
  return groupBy(rows, (row) =>
    row.strategy ? { key: row.strategy, label: row.strategy } : null,
  );
}

export function byMarket(
  rows: AnalyticsRow[],
  labels: Record<string, string>,
): GroupStats[] {
  return groupBy(rows, (row) => ({
    key: row.market,
    label: labels[row.market] ?? row.market,
  }));
}

export function byDirection(rows: AnalyticsRow[]): GroupStats[] {
  const order = ["long", "short"];
  return groupBy(rows, (row) => ({
    key: row.direction,
    label: row.direction === "long" ? "Long" : "Short",
  })).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export function favouritesSplit(rows: AnalyticsRow[]) {
  return {
    favorites: computeStats(rows.filter((row) => row.is_favorite)),
    all: computeStats(rows),
  };
}

/* -------------------------------------------------------------------------- */
/* Time series                                                                */
/* -------------------------------------------------------------------------- */

export type Granularity = "daily" | "weekly" | "monthly";

export interface TimeBucket {
  key: string;
  label: string;
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Monday-anchored week start, as a date string. */
function weekStart(date: string): string {
  const weekday = dayOfWeek(date);
  const backTo = weekday === 0 ? 6 : weekday - 1;
  return shiftDays(date, -backTo);
}

/**
 * Picks the aggregation that keeps the bar count readable: a chart with 400
 * daily bars is a smear, and one with 2 monthly bars says nothing.
 */
export function pickGranularity(dates: string[]): Granularity {
  if (dates.length === 0) return "daily";

  const sorted = [...dates].sort();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const span =
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) /
    86_400_000;

  if (span <= 45) return "daily";
  if (span <= 250) return "weekly";
  return "monthly";
}

export function timeSeries(
  rows: AnalyticsRow[],
  granularity: Granularity,
): TimeBucket[] {
  const buckets = new Map<string, TimeBucket>();

  for (const row of rows) {
    const date = setupDate(row);
    const { year, month, day } = toParts(date);

    let key: string;
    let label: string;

    if (granularity === "monthly") {
      key = `${year}-${pad(month)}`;
      label = `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`;
    } else if (granularity === "weekly") {
      key = weekStart(date);
      const start = toParts(key);
      label = `${start.day} ${MONTH_LABELS[start.month - 1]}`;
    } else {
      key = date;
      label = `${day} ${MONTH_LABELS[month - 1]}`;
    }

    const bucket = buckets.get(key) ?? {
      key,
      label,
      total: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      pending: 0,
    };

    bucket.total++;
    if (row.result === "win") bucket.wins++;
    else if (row.result === "loss") bucket.losses++;
    else if (row.result === "breakeven") bucket.breakeven++;
    else bucket.pending++;

    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                   */
/* -------------------------------------------------------------------------- */

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  total: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
}

/**
 * A six-row grid starting on Monday, including the leading and trailing days
 * from the neighbouring months so the shape never jumps between months.
 */
export function calendarMonth(
  rows: AnalyticsRow[],
  year: number,
  month: number,
): CalendarDay[] {
  const counts = new Map<string, Omit<CalendarDay, "date" | "day" | "inMonth">>();

  for (const row of rows) {
    const date = setupDate(row);
    const entry = counts.get(date) ?? {
      total: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      pending: 0,
    };

    entry.total++;
    if (row.result === "win") entry.wins++;
    else if (row.result === "loss") entry.losses++;
    else if (row.result === "breakeven") entry.breakeven++;
    else entry.pending++;

    counts.set(date, entry);
  }

  const first = isoDate(year, month, 1);
  const firstWeekday = dayOfWeek(first);
  const lead = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const start = shiftDays(first, -lead);

  const days: CalendarDay[] = [];
  for (let index = 0; index < 42; index++) {
    const date = shiftDays(start, index);
    const parts = toParts(date);
    const entry = counts.get(date);

    days.push({
      date,
      day: parts.day,
      inMonth: parts.year === year && parts.month === month,
      total: entry?.total ?? 0,
      wins: entry?.wins ?? 0,
      losses: entry?.losses ?? 0,
      breakeven: entry?.breakeven ?? 0,
      pending: entry?.pending ?? 0,
    });
  }

  return days;
}

/** Bucketed 0–4 so the heat scale never depends on one outlier day. */
export function activityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total === 0) return 0;
  if (total <= 2) return 1;
  if (total <= 4) return 2;
  if (total <= 9) return 3;
  return 4;
}

export function monthLabel(year: number, month: number) {
  return `${
    [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ][month - 1]
  } ${year}`;
}

/* -------------------------------------------------------------------------- */
/* Recent windows                                                             */
/* -------------------------------------------------------------------------- */

export function withinLastDays(
  rows: AnalyticsRow[],
  days: number,
  today: string,
): AnalyticsRow[] {
  const from = shiftDays(today, -(days - 1));
  return rows.filter((row) => {
    const date = setupDate(row);
    return date >= from && date <= today;
  });
}

export function formatWinRate(rate: number | null) {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

export function formatRr(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}R`;
}
