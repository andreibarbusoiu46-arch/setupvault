"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DURATION, EASE_OUT } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";
import { cn, formatDate } from "@/lib/utils";
import {
  activityLevel,
  calendarMonth,
  monthLabel,
  setupDate,
  type AnalyticsRow,
} from "@/features/analytics/utils/compute";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Intensity steps. Four levels, one hue — a heat map, not a palette. */
const LEVEL_CLASS = [
  "bg-transparent",
  "bg-accent/15",
  "bg-accent/30",
  "bg-accent/50",
  "bg-accent/75",
] as const;

export function TradingCalendar({
  rows,
  initialYear,
  initialMonth,
  today,
}: {
  rows: AnalyticsRow[];
  initialYear: number;
  initialMonth: number;
  /** Passed from the server as YYYY-MM-DD so both sides agree on "today". */
  today: string;
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const days = calendarMonth(rows, year, month);
  const monthTotal = days
    .filter((day) => day.inMonth)
    .reduce((sum, day) => sum + day.total, 0);

  const move = (delta: number) => {
    const next = month + delta;
    if (next < 1) {
      setMonth(12);
      setYear(year - 1);
    } else if (next > 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(next);
    }
  };

  const goToday = () => {
    const [y, m] = today.split("-").map(Number);
    setYear(y);
    setMonth(m);
  };

  const selectedRows = selected
    ? rows.filter((row) => setupDate(row) === selected)
    : [];

  return (
    <Card glass className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-fg">Trading calendar</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {monthTotal === 0
              ? "No setups this month"
              : `${monthTotal} ${monthTotal === 1 ? "setup" : "setups"} this month`}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Previous month"
            onClick={() => move(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Next month"
            onClick={() => move(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <p
        className="mt-4 text-sm font-medium text-fg"
        aria-live="polite"
      >
        {monthLabel(year, month)}
      </p>

      <div className="mt-3 grid grid-cols-7 gap-1" role="grid">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            role="columnheader"
            className="pb-1 text-center text-xs text-fg-subtle"
          >
            <span aria-hidden="true">{weekday.slice(0, 1)}</span>
            <span className="sr-only">{weekday}</span>
          </div>
        ))}

        {days.map((day) => {
          const level = activityLevel(day.total);
          const isToday = day.date === today;

          return (
            <button
              key={day.date}
              type="button"
              role="gridcell"
              disabled={day.total === 0}
              onClick={() => setSelected(day.date)}
              aria-label={
                day.total === 0
                  ? `${day.date}, no setups`
                  : `${day.date}, ${day.total} setups, ${day.wins} wins, ${day.losses} losses`
              }
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors",
                LEVEL_CLASS[level],
                day.inMonth ? "border-border" : "border-transparent opacity-35",
                day.total > 0
                  ? "cursor-pointer text-fg hover:border-accent/60"
                  : "cursor-default text-fg-subtle",
                isToday && "ring-1 ring-accent ring-offset-1 ring-offset-canvas",
              )}
            >
              <span className="numeric">{day.day}</span>
              {day.total > 0 ? (
                <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
                  {day.wins > 0 ? (
                    <span className="size-1 rounded-full bg-positive" />
                  ) : null}
                  {day.losses > 0 ? (
                    <span className="size-1 rounded-full bg-negative" />
                  ) : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-fg-subtle">
        <span>Less</span>
        {LEVEL_CLASS.map((className, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn("size-3 rounded border border-border", className)}
          />
        ))}
        <span>More</span>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-h-[80dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formatDate(selected) ?? selected}</DialogTitle>
            <DialogDescription>
              {selectedRows.length}{" "}
              {selectedRows.length === 1 ? "setup" : "setups"} on this date.
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence initial={false}>
            <motion.ul
              className="divide-y divide-border"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.quick, ease: EASE_OUT }}
            >
              {selectedRows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`${ROUTES.setups}/${row.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-surface-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fg">{row.title}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                        <span className="numeric text-fg-muted">{row.ticker}</span>
                        <DirectionBadge direction={row.direction} variant="text" />
                      </p>
                    </div>
                    <ResultBadge result={row.result} />
                  </Link>
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
