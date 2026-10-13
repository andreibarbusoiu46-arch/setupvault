"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/motion";
import type { TradeResult } from "@/types/database";

/**
 * The trend arrow that sits inside a result badge.
 *
 * Deliberately a diagonal line with a head, not the solid triangle used for
 * Long/Short — a winning short would otherwise show a downward triangle beside
 * an upward marker and read as a contradiction. It also means the result is
 * legible without relying on colour alone.
 */
const PATHS: Record<TradeResult, { line: string; head: string | null }> = {
  win: { line: "M2 10 L10 2", head: "M6 2 L10 2 L10 6" },
  loss: { line: "M2 2 L10 10", head: "M6 10 L10 10 L10 6" },
  breakeven: { line: "M2 6 L10 6", head: null },
  pending: { line: "M2 6 L10 6", head: null },
};

export function ResultArrow({ result }: { result: TradeResult }) {
  const reduceMotion = useReducedMotion();
  const { line, head } = PATHS[result];

  const draw = reduceMotion
    ? undefined
    : {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
      };

  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="size-3 shrink-0"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    >
      <motion.path
        d={line}
        stroke="currentColor"
        strokeDasharray={result === "pending" ? "2.5 2.5" : undefined}
        {...draw}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
      />
      {head ? (
        <motion.path
          d={head}
          stroke="currentColor"
          {...draw}
          transition={{
            duration: DURATION.quick,
            ease: EASE_OUT,
            delay: reduceMotion ? 0 : 0.22,
          }}
        />
      ) : null}
    </svg>
  );
}
