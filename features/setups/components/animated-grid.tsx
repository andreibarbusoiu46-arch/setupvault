"use client";

import { motion, useReducedMotion } from "framer-motion";

import { riseItem, staggerContainer } from "@/lib/motion";

/**
 * Staggers the cards into place. The `resetKey` is the serialised filter
 * state: changing it remounts the list so a new set of results animates in,
 * which is what makes a filter change readable rather than an abrupt swap.
 */
export function AnimatedGrid({
  resetKey,
  className = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
  stagger = true,
  children,
}: {
  resetKey: string;
  className?: string;
  /**
   * Off for the row view. A stagger makes a filter change readable when there
   * are a dozen cards; across sixty rows it is a second and a half of waiting
   * in front of a list somebody opened in order to read it.
   */
  stagger?: boolean;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion || !stagger) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={resetKey}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGridItem({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return <motion.div variants={riseItem}>{children}</motion.div>;
}
