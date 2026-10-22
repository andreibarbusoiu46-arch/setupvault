"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Sparkles, Target } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  INSTRUMENT,
  KEY_LEVEL,
  PLAY,
  R_MULTIPLE,
} from "@/features/marketing/data/breakout-sim";
import type { SceneEvent } from "@/features/marketing/components/trading-scene";

/**
 * The notices the chart raises as its session plays out.
 *
 * They are driven by the scene's own milestones, not by timers of their own.
 * Two independent clocks would agree for a cycle or two and then drift, and
 * a notice about a break that arrives four seconds after the break is worse
 * than no notice — so the chart emits, and this renders what it emits.
 *
 * Every line is written to be read as a demonstration rather than as a
 * record: nothing here reports a filled order, a realised profit, or an AI
 * verdict that actually ran. The copy says "illustrative" because it is.
 */

export interface Notice {
  id: SceneEvent;
  icon: typeof Target;
  title: string;
  body: string;
  tone: "accent" | "positive";
}

export const NOTICES: Record<Exclude<SceneEvent, "reset">, Notice> = {
  break: {
    id: "break",
    icon: ArrowUpRight,
    title: `Key level broken · ${INSTRUMENT}`,
    body: `${PLAY} triggered at ${KEY_LEVEL.toFixed(2)}`,
    tone: "accent",
  },
  target: {
    id: "target",
    icon: Target,
    title: `Target reached · ${R_MULTIPLE}`,
    body: "Illustrative target · plan adherence recorded",
    tone: "positive",
  },
  complete: {
    id: "complete",
    icon: Sparkles,
    title: "SetupVault AI · Grade A+",
    body: "Illustrative review of the retest and risk. Saved to your vault.",
    tone: "accent",
  },
};

const SPRING = { type: "spring", stiffness: 400, damping: 32, mass: 0.8 } as const;

export function NotificationStack({
  shown,
  className,
}: {
  /** Milestones the scene has reached this cycle, oldest first. */
  shown: SceneEvent[];
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  const items = shown
    .filter((id): id is Exclude<SceneEvent, "reset"> => id !== "reset")
    .map((id) => NOTICES[id]);

  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      <AnimatePresence initial={false}>
        {items.map((notice, index) => {
          const Icon = notice.icon;
          // Older notices sit back a little rather than scrolling away. The
          // depth is slight on purpose — enough to say "this one is newer",
          // not enough to make the older ones hard to read.
          const depth = items.length - 1 - index;
          return (
            <motion.li
              key={notice.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
              animate={{
                opacity: depth > 1 ? 0.55 : 1,
                y: 0,
                scale: 1 - Math.min(depth, 2) * 0.025,
              }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
              transition={reduceMotion ? { duration: 0 } : SPRING}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border p-2.5",
                // Glass that does not depend on backdrop-filter to be
                // legible: these sit over a bright chart in one theme and a
                // dark one in the other.
                "border-black/[0.08] bg-white/90 backdrop-blur-xl",
                "dark:border-white/[0.12] dark:bg-[#0c1017]/90",
                "shadow-[0_1px_2px_-1px_rgb(0_0_0/0.25),0_16px_36px_-18px_rgb(0_0_0/0.5)]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg",
                  notice.tone === "positive"
                    ? "bg-[#10b981]/15 text-[#047857] dark:text-[#34d399]"
                    : "bg-[#4f8cff]/15 text-[#2563eb] dark:text-[#8fb4ff]",
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} aria-hidden="true" />
              </span>

              <div className="min-w-0">
                <p className="truncate text-[11.5px] font-semibold tracking-tight text-fg">
                  {notice.title}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-fg-subtle">
                  {notice.body}
                </p>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
