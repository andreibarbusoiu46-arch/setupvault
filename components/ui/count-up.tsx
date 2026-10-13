"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  motion,
} from "framer-motion";

import { DURATION, EASE_OUT } from "@/lib/motion";

/**
 * Counts a figure up to its real value once, when it scrolls into view.
 *
 * Driven by a motion value rather than React state: a state update per frame
 * would re-render the whole card sixty times a second for a decorative effect.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();

  const count = useMotionValue(reduceMotion ? value : 0);
  const text = useTransform(
    count,
    (latest) => `${prefix}${latest.toFixed(decimals)}${suffix}`,
  );

  useEffect(() => {
    if (reduceMotion) {
      count.set(value);
      return;
    }
    if (!inView) return;

    const controls = animate(count, value, {
      duration: DURATION.slow,
      ease: EASE_OUT,
    });
    return () => controls.stop();
  }, [inView, value, count, reduceMotion]);

  return (
    <span ref={ref}>
      <motion.span>{text}</motion.span>
    </span>
  );
}
