"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";
import { BARS } from "@/features/marketing/data/nq-session";
import {
  BREAK_INDEX,
  ENTRY,
  FINAL_PRICE,
  INSTRUMENT,
  PLAY,
  R_MULTIPLE,
  STOP,
} from "@/features/marketing/data/breakout-sim";
import {
  SCENE_H,
  SCENE_W,
  TradingScene,
  sceneX,
  type SceneEvent,
} from "@/features/marketing/components/trading-scene";
import { calculateSetupScore } from "@/features/setup-score/utils/score";

/**
 * The hero's 3D stage.
 *
 * A single tilted plane carrying three layers of depth: a session panel
 * pushed back behind the glass, the equity curve on the middle plane, and two
 * logged setups pinned forward onto exact points of that curve with leader
 * lines running back to their nodes.
 *
 * ── Why the cards are opaque ──────────────────────────────────────────────
 * Everything inside this component lives in a `preserve-3d` context, and
 * WebKit drops any layer carrying a `backdrop-filter` inside one. That is the
 * bug that made this project's 3D invisible on iOS three times. So the glass
 * here is built from an opaque base plus a specular top edge, a hairline and
 * a deep shadow — no backdrop blur anywhere below the stage root. It reads as
 * black glass and it actually renders on a phone.
 *
 * ── Why the chart is hand-drawn ───────────────────────────────────────────
 * The cards pin to specific data points, and a leader line has to terminate
 * exactly on its node. That needs the node's coordinates at render time.
 * Recharts computes its scales internally and only exposes them through the
 * rendered DOM, so pinning against it would mean duplicating the scale maths
 * here — two sources of truth, drifting the first time either changes. The
 * curve below is projected by `pointAt`, and the cards and lines read their
 * positions from the same function.
 */

/* ── The pinned setup ──────────────────────────────────────────────────── */

/** Directly over the candle that closed above the level, not an arbitrary spot. */
const PIN_ANCHOR = { x: sceneX(BREAK_INDEX), y: 116 };

/** Scores come from the product's own engine, not from a number typed here. */
function scoreFor(input: {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  tagCount: number;
  notesLength: number;
}) {
  return calculateSetupScore({
    direction: "long",
    ticker: "—",
    market: "futures",
    tradedOn: "2026-10-16",
    entry: input.entry,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
    strategy: "—",
    notesLength: input.notesLength,
    hasScreenshot: true,
    tagCount: input.tagCount,
  });
}

const PINS = [
  {
    index: 21,
    pair: INSTRUMENT,
    play: PLAY,
    // The same R the notification quotes, from the same module. Two numbers
    // for one trade on one screen is how a page stops being believed.
    r: R_MULTIPLE,
    won: true,
    bars: BARS.slice(6, 16),
    score: scoreFor({
      entry: ENTRY,
      stopLoss: STOP,
      takeProfit: FINAL_PRICE,
      tagCount: 4,
      notesLength: 210,
    }),
  },
  {
    index: 46,
    pair: "NAS100",
    play: "NY reversal",
    r: "−1.0R",
    won: false,
    bars: BARS.slice(44, 54),
    score: scoreFor({
      entry: 20110,
      stopLoss: 20160,
      takeProfit: 20010,
      tagCount: 1,
      notesLength: 0,
    }),
  },
] as const;

/* ── Pieces ──────────────────────────────────────────────────────────────── */

/**
 * Black glass. Opaque base, one specular line along the top edge, a hairline
 * and two shadows. No backdrop-filter — see the note at the top of the file.
 */
const GLASS = cn(
  "rounded-xl border",
  // Light: a raised white card with a grey hairline and a soft shadow.
  // Dark: near-black glass with a specular top edge and a much deeper one.
  // The specular line is the detail that reads as a bevel, and it has to
  // invert — a white inset highlight on a white card is invisible, and a
  // grey one on black is dirt.
  "border-black/[0.08] bg-white",
  "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.9),0_1px_2px_-1px_rgb(16_24_40/0.2),0_18px_40px_-18px_rgb(16_24_40/0.35)]",
  "dark:border-white/[0.14] dark:bg-[#090b11]/95",
  "dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.15),0_2px_6px_-2px_rgb(0_0_0/0.8),0_28px_60px_-24px_rgb(0_0_0/0.95)]",
);

/** A real candlestick thumbnail with the trade's own levels drawn over it. */
function Thumb({
  bars,
  won,
}: {
  bars: readonly (readonly [number, number, number, number])[];
  won: boolean;
}) {
  const lo = Math.min(...bars.map((b) => b[2]));
  const hi = Math.max(...bars.map((b) => b[1]));
  const span = hi - lo || 1;
  const y = (v: number) => 46 - ((v - lo) / span) * 40;

  // Entry a third up the range, stop under the low, target near the high.
  const entry = lo + span * 0.34;
  const stop = lo + span * 0.1;
  const target = lo + span * 0.88;

  return (
    <svg viewBox="0 0 112 52" className="block h-[42px] w-[92px]" aria-hidden="true">
      <rect x="0" y="0" width="112" height="52" rx="5" className="fill-canvas-subtle" />
      {/* Reward above the entry, risk below it. */}
      <rect x="0" y={y(target)} width="112" height={Math.max(y(entry) - y(target), 1)} fill="#10b981" opacity="0.10" />
      <rect x="0" y={y(entry)} width="112" height={Math.max(y(stop) - y(entry), 1)} fill="#ef4444" opacity="0.12" />
      <line x1="0" x2="112" y1={y(entry)} y2={y(entry)} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="3 3" />

      {bars.map(([o, h, l, c], i) => {
        const cx = 10 + i * 10.4;
        const bull = c >= o;
        const top = y(Math.max(o, c));
        const height = Math.max(Math.abs(y(o) - y(c)), 1.2);
        return (
          <g key={cx}>
            <line x1={cx} x2={cx} y1={y(h)} y2={y(l)} stroke={bull ? "#10b981" : "#ef4444"} strokeWidth="0.9" />
            <rect x={cx - 2.6} y={top} width="5.2" height={height} rx="0.8" fill={bull ? "#10b981" : "#ef4444"} />
          </g>
        );
      })}

      <circle cx="104" cy="8" r="3" fill={won ? "#10b981" : "#ef4444"} opacity="0.9" />
    </svg>
  );
}

function SetupCard({ pin }: { pin: (typeof PINS)[number] }) {
  return (
    <div className={cn(GLASS, "w-[232px] overflow-hidden p-2.5")}>
      <div className="flex items-center gap-2.5">
        <Thumb bars={pin.bars} won={pin.won} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold tracking-tight text-fg">
            {pin.pair}
          </p>
          <p className="truncate text-[10.5px] text-fg-subtle">{pin.play}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5">
        <span
          className={cn(
            "numeric rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
            pin.won
              ? "bg-[#10b981]/15 text-[#047857] dark:text-[#34d399]"
              : "bg-[#ef4444]/15 text-[#b91c1c] dark:text-[#f87171]",
          )}
        >
          {pin.r} {pin.won ? "Win" : "Loss"}
        </span>
        <span className="numeric ml-auto rounded-md bg-surface-hover px-1.5 py-0.5 text-[10.5px] text-fg-muted">
          {pin.score.grade} · {pin.score.score}
        </span>
      </div>
    </div>
  );
}

/* ── The stage ───────────────────────────────────────────────────────────── */

export function HeroStage({
  className,
  onEvent,
  broken,
}: {
  className?: string;
  /** Milestones from the session, forwarded to the notification stack. */
  onEvent?: (event: SceneEvent) => void;
  /** Whether the session has broken its level this cycle. */
  broken?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);

  // Pointer parallax. Motion values, so moving the mouse never triggers a
  // React render — the transform is written straight to the compositor.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 60, damping: 18, mass: 0.6 });

  // Base attitude plus a few degrees of lean toward the cursor.
  const rotateX = useTransform(sy, [-1, 1], [26, 17]);
  const rotateY = useTransform(sx, [-1, 1], [-19, -8]);

  useEffect(() => {
    // Fine pointers only. On a touch screen there is no hover to track, and
    // the device-orientation permission prompt a gyro would need is a worse
    // trade than a scene that simply floats on its own.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    const onMove = (event: PointerEvent) => {
      const box = host.current?.getBoundingClientRect();
      if (!box) return;
      px.set(((event.clientX - box.left) / box.width) * 2 - 1);
      py.set(((event.clientY - box.top) / box.height) * 2 - 1);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn("pointer-events-none select-none", className)}
      style={{ WebkitPerspective: "1200px", perspective: "1200px" }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{
          rotateX,
          rotateY,
          rotateZ: 6,
          WebkitTransformStyle: "preserve-3d",
          transformStyle: "preserve-3d",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
        // A slow drift so the scene is alive before anyone touches it.
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Layer 1 — the other record in the library, further back and
            softened so the eye reads it as behind rather than merely
            smaller. A losing setup on purpose: a hero that shows only
            winners is the thing every trader has learned to distrust. */}
        <div
          className="absolute left-[2%] top-[14%] hidden w-[17rem] opacity-80 blur-[0.5px] lg:block"
          style={{ transform: "translateZ(-46px)" }}
        >
          <div className="origin-bottom-left scale-[0.84]">
            <SetupCard pin={PINS[1]} />
          </div>
        </div>

        {/* Layer 2 — the session. It runs its own state machine and writes
            every frame straight to the DOM; nothing in this subtree
            re-renders while it plays. */}
        <div className="absolute inset-0" style={{ transform: "translateZ(12px)" }}>
          <TradingScene onEvent={onEvent} />
        </div>

        {/* Layer 3 — the saved setup, forward of everything.

            It is pinned to the break itself rather than to an arbitrary
            point, and it arrives when the break does: the card is the record
            the chart just produced, so showing it before the move has
            happened would be telling the story backwards. */}
        <div
          className="absolute"
          style={{
            left: `${(PIN_ANCHOR.x / SCENE_W) * 100}%`,
            top: `${(PIN_ANCHOR.y / SCENE_H) * 100}%`,
            transform: "translateZ(74px) translate(-50%, -100%)",
          }}
        >
          <div
            className={cn(
              "origin-bottom scale-[0.72] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] sm:scale-[0.76] lg:scale-100",
              broken ? "opacity-100 blur-0" : "translate-y-2 opacity-0 blur-[2px]",
            )}
          >
            <SetupCard pin={PINS[0]} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

