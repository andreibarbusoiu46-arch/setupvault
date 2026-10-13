"use client";

import { motion, useReducedMotion } from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MAX_SCORE } from "@/features/setup-score/constants";
import type { Grade } from "@/features/setup-score/constants";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The score, drawn as a ring. Single accent colour on purpose: a red-to-green
 * gauge would read as a buy signal, which is precisely what this is not.
 * The grade is rendered as text so the value never depends on colour alone.
 */
export function ScoreRing({
  score,
  grade,
  size = 132,
  className,
}: {
  score: number;
  grade: Grade;
  size?: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const progress = Math.max(0, Math.min(1, score / MAX_SCORE));

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Setup quality score ${score} out of ${MAX_SCORE}, grade ${grade}`}
    >
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-surface-hover"
        />
        <motion.circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-accent"
          strokeDasharray={CIRCUMFERENCE}
          initial={{
            strokeDashoffset: reduceMotion
              ? CIRCUMFERENCE * (1 - progress)
              : CIRCUMFERENCE,
          }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="stat text-3xl leading-none text-fg">{score}</span>
        <span className="mt-1.5 text-xs font-medium text-accent">{grade}</span>
      </div>
    </div>
  );
}
