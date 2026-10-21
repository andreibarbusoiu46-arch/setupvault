"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/utils";
import { EQUITY } from "@/features/marketing/data/playbook";
import { BARS } from "@/features/marketing/data/nq-session";
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

/* ── Projection ──────────────────────────────────────────────────────────── */

const VIEW_W = 1000;
const VIEW_H = 430;
const PAD = { left: 48, right: 56, top: 104, bottom: 96 };

const MAX_R = Math.max(...EQUITY.map((p) => p.r));

/** Data index → coordinates in the SVG's own space. One source of truth. */
function pointAt(index: number) {
  const span = EQUITY.length - 1;
  const x = PAD.left + (index / span) * (VIEW_W - PAD.left - PAD.right);
  const plot = VIEW_H - PAD.top - PAD.bottom;
  const y = VIEW_H - PAD.bottom - (EQUITY[index].r / MAX_R) * plot;
  return { x, y };
}

/** Catmull-Rom through every point, emitted as a cubic path. Smooth, and it
 *  actually passes through the nodes — which matters when something is pinned
 *  to one. A plain quadratic smoothing would miss them by a few pixels. */
function curvePath(): string {
  const pts = EQUITY.map((_, i) => pointAt(i));
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

const CURVE = curvePath();
const AREA = `${CURVE} L ${pointAt(EQUITY.length - 1).x.toFixed(2)} ${VIEW_H - PAD.bottom} L ${PAD.left} ${VIEW_H - PAD.bottom} Z`;

/* ── The two pinned setups ───────────────────────────────────────────────── */

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
    pair: "XAUUSD",
    play: "London breakout",
    r: "+3.4R",
    won: true,
    // Candles lifted from the real session, so the thumbnail is a chart
    // rather than a decoration.
    bars: BARS.slice(6, 16),
    score: scoreFor({
      entry: 2412,
      stopLoss: 2404,
      takeProfit: 2439,
      tagCount: 4,
      notesLength: 210,
    }),
    // The point the leader line terminates on and the card's bottom-centre
    // sits at, in the SVG's own units. Percent offsets were tried first and
    // put one card through the navbar: a percentage of the plane is not a
    // position on the plane once the plane is rotated.
    anchor: { x: 372, y: 182 },
    z: 78,
    narrow: true,
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
    anchor: { x: 724, y: 150 },
    z: 44,
    // Two 232px cards cannot both be legible on a 390px plane. The loser
    // steps aside there and the winner gets the room to be readable; both
    // return as soon as there is width for them.
    narrow: false,
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

const WEEKDAYS = [
  { day: "Monday", value: 72, up: true },
  { day: "Tuesday", value: 48, up: true },
  { day: "Wednesday", value: 91, up: true },
  { day: "Thursday", value: 34, up: false },
  { day: "Friday", value: 61, up: true },
];

function SessionPanel() {
  return (
    <div className={cn(GLASS, "w-full p-3.5")}>
      <p className="text-[11px] font-semibold tracking-tight text-fg">
        By weekday
      </p>
      <p className="mt-0.5 text-[9.5px] text-fg-subtle">Net R, last 60 setups</p>

      <ul className="mt-3 flex flex-col gap-2">
        {WEEKDAYS.map((row) => (
          <li key={row.day}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[10px] text-fg-muted">{row.day}</span>
              <span
                className="numeric text-[10px] font-semibold text-[color:var(--hs-pos)] dark:text-[color:var(--hs-pos-d)]"
                style={{
                  // One variable per row so light and dark each get a value
                  // that actually passes contrast on their own background.
                  ["--hs-pos" as string]: row.up ? "#047857" : "#b91c1c",
                  ["--hs-pos-d" as string]: row.up ? "#34d399" : "#f87171",
                }}
              >
                {row.up ? "+" : "−"}
                {(row.value / 20).toFixed(1)}R
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.07]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${row.value}%`,
                  background: row.up ? "#10b981" : "#ef4444",
                  boxShadow: `0 0 10px -1px ${row.up ? "#10b981" : "#ef4444"}`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── The stage ───────────────────────────────────────────────────────────── */

export function HeroStage({ className }: { className?: string }) {
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
        {/* Layer 1 — pushed back behind the glass, and softened, so the eye
            reads it as further away rather than merely smaller. */}
        <div
          className="absolute left-[0.5%] top-[30%] hidden w-[20.5%] opacity-80 blur-[0.6px] md:block"
          style={{ transform: "translateZ(-40px)" }}
        >
          <SessionPanel />
        </div>

        {/* Layer 2 — the curve. */}
        <div className="absolute inset-0" style={{ transform: "translateZ(12px)" }}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
          >
            <defs>
              <linearGradient id="hs-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="55%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="hs-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.30" />
                <stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <filter id="hs-glow" x="-10%" y="-40%" width="120%" height="200%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizon rules. Four, barely there — enough to read a level
                against without becoming a grid. */}
            {[0.25, 0.45, 0.65, 0.85].map((t) => {
              const y = PAD.top + t * (VIEW_H - PAD.top - PAD.bottom);
              return (
                <line
                  key={t}
                  x1={PAD.left}
                  x2={VIEW_W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#ffffff"
                  strokeOpacity="0.05"
                  strokeWidth="1"
                  strokeDasharray="2 10"
                />
              );
            })}

            <path d={AREA} fill="url(#hs-fill)" />
            <path
              d={CURVE}
              fill="none"
              stroke="url(#hs-stroke)"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#hs-glow)"
            />

            {/* Leader lines, drawn here so each one ends exactly on its node.
                An elbow rather than a diagonal: it reads as a callout instead
                of as a stray stroke across the chart. */}
            {PINS.map((pin) => {
              const node = pointAt(pin.index);
              // Up from the node, then across to the card. An elbow reads as
              // a callout; a bare diagonal reads as a stray stroke over the
              // chart, which is what the first version looked like.
              const turn = (node.y + pin.anchor.y) / 2;
              return (
                <g key={pin.index}>
                  <path
                    d={`M ${node.x} ${node.y} V ${turn} H ${pin.anchor.x} V ${pin.anchor.y}`}
                    stroke="#38bdf8"
                    strokeOpacity="0.5"
                    strokeWidth="1.2"
                    strokeDasharray="3 4"
                    fill="none"
                  />
                  <circle cx={node.x} cy={node.y} r="9" fill="#38bdf8" opacity="0.14">
                    <animate
                      attributeName="r"
                      values="6;13;6"
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.22;0;0.22"
                      dur="2.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="3.6"
                    fill="#e2f4ff"
                    stroke="#38bdf8"
                    strokeWidth="1.6"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Layer 3 — the setups, forward of everything. */}
        {/* The setups, forward of everything, at every width.

            They used to vanish below `md` and reappear as a plain stacked
            list under the copy, which threw away the whole point of the
            composition — a card pinned to the exact trade that produced that
            part of the curve. A 232px card simply does not fit a 390px
            phone, so it is scaled rather than hidden. The scale sits on an
            inner wrapper: the outer box keeps its unscaled height, so
            translate(-100%) still lands the card's bottom edge precisely on
            the anchor the leader line arrives at. */}
        {PINS.map((pin) => (
          <div
            key={pin.index}
            className={cn("absolute", !pin.narrow && "hidden sm:block")}
            style={{
              left: `${(pin.anchor.x / VIEW_W) * 100}%`,
              top: `${(pin.anchor.y / VIEW_H) * 100}%`,
              transform: `translateZ(${pin.z}px) translate(-50%, -100%)`,
            }}
          >
            <div className="origin-bottom scale-[0.72] sm:scale-[0.76] lg:scale-100">
              <SetupCard pin={pin} />
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

