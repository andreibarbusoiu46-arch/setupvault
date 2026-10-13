import type { Transition, Variants } from "framer-motion";

/**
 * One set of motion tokens for the whole product, so nothing drifts into its
 * own timing. The curve is a long decelerating ease: fast to start, settling
 * slowly — the "fluid and ample" end of the scale rather than the snappy one.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  quick: 0.28,
  base: 0.5,
  slow: 0.75,
} as const;

export const transition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

/** Children settle one after another rather than all at once. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT },
  },
};

export const scaleItem: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.quick, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    transition: { duration: 0.18, ease: EASE_IN_OUT },
  },
};
