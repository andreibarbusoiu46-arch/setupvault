"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * A figure that counts up to its value without re-rendering anything.
 *
 * The number lives in a MotionValue and the formatted string is derived from
 * it, so framer writes straight into the text node sixty times a second and
 * React renders once. The obvious version — `useState` in a rAF loop — costs
 * a render per frame per figure, and there are eleven of these on the page.
 *
 * It starts at its final value, which is what the server sends and what a
 * reader without JavaScript keeps. `run` winding it back to zero is the
 * animation; the correct number is the default.
 */
export function AnimatedNumber({
  value,
  run,
  format,
  duration = 1.1,
  delay = 0,
  className,
}: {
  value: number;
  /** False until the sequence reaches this figure's step. */
  run: boolean;
  format: (value: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const count = useMotionValue(value);
  const text = useTransform(count, format);
  // Held in a ref so a changing `format` prop cannot retrigger the run.
  const started = useRef(false);

  useEffect(() => {
    if (!run) {
      started.current = false;
      return;
    }
    if (started.current) return;
    started.current = true;

    count.set(0);
    const controls = animate(count, value, {
      duration,
      delay,
      // The brief's curve. Fast away, long settle — a counter that eases in
      // reads as buffering.
      ease: [0.32, 0.72, 0, 1],
    });
    return () => controls.stop();
  }, [run, value, duration, delay, count]);

  return (
    <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>
  );
}
