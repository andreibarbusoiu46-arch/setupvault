"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BrainCircuit,
  Crosshair,
  LineChart,
  Maximize,
  MousePointer2,
  Pencil,
  Ruler,
  Search,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  BARS,
  LEVELS,
  RISK_REWARD_LABEL,
  SESSION,
  VOLUMES,
  barTimeLabel,
  priceAxis,
  priceScaler,
  volumeScale,
} from "@/features/marketing/data/nq-session";

/**
 * The hero's chart, in two compositions.
 *
 * A 1400px trading terminal cannot be made legible at 390px by scaling, so the
 * phone gets a panel built for its width from the same candle series: fewer
 * bars, drawn far wider, stacked vertically. Both carry the same 3D tilt and
 * the same slow float.
 *
 * Two rules hold this file together, and both come from bugs that were real.
 *
 * 1. Entrances are CSS animations, never motion `initial`/`animate`, and they
 *    never animate opacity. A motion component server-renders `opacity: 0`
 *    inline and lifts it only once its JavaScript has hydrated; a panel whose
 *    visibility waits on an animation is invisible wherever that animation is
 *    dropped. The panels are opaque from the first paint. Motion drives only
 *    the continuous float, which is a loss of nothing if it never runs.
 *
 * 2. Nothing inside the tilted node carries a backdrop-filter. WebKit drops a
 *    layer that holds one inside a `preserve-3d` context, so on iOS the panel
 *    disappears rather than frosting. The glass in this composition is real —
 *    it is on the floating badges, which are deliberately siblings of the
 *    tilted panel rather than children of it. Flat crystal cards hovering over
 *    a tilted terminal also read as more depth than tilting everything
 *    together, so the constraint and the design agree.
 */

const WEBKIT_3D = {
  WebkitTransformStyle: "preserve-3d",
  transformStyle: "preserve-3d",
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
} as const;

const PERSPECTIVE_WIDE = {
  WebkitPerspective: "1200px",
  perspective: "1200px",
} as const;

const PERSPECTIVE_NARROW = {
  WebkitPerspective: "900px",
  perspective: "900px",
} as const;

/**
 * The instrument and the three readings every surface on the page agrees on.
 * All four are read off the frozen session rather than typed here, so the
 * ladder in the hero can never disagree with the chart beside it.
 */
export const INSTRUMENT = SESSION.label;
export const TARGET = String(LEVELS.target);
export const LIVE = String(LEVELS.live);
export const ENTRY = String(LEVELS.entry);

/**
 * The wide terminal's 600-unit box, split the way a charting platform splits
 * it: price on top, volume on its own pane underneath, a gap between them.
 */
const PRICE_H = 470;
const VOL_TOP = 500;
const VOL_H = 100;

const yPrice = priceScaler(PRICE_H);

/**
 * Real bars, mapped into the price pane. `open`/`close`/`high`/`low` hold y
 * coordinates from here down — a higher price is a smaller y — while
 * `isBull` is decided on the prices themselves, before the axis inverts them.
 */
const WIDE_CANDLES = BARS.map(([o, h, l, c], index) => ({
  x: index * 14 + 60,
  open: yPrice(o),
  close: yPrice(c),
  high: yPrice(h),
  low: yPrice(l),
  isBull: c >= o,
}));

const WIDE_AXIS = priceAxis(6);

const toShare = volumeScale();
const VOLUME_SHARE = VOLUMES.map(toShare);

/** Where the setup's own levels land in the same pane. */
const Y_ENTRY = yPrice(LEVELS.entry);
const Y_STOP = yPrice(LEVELS.stop);
const Y_TARGET = yPrice(LEVELS.target);
const Y_LIVE = yPrice(LEVELS.live);

/** The bar the position is opened on: the reclaim of the swept low. */
const ENTRY_X = 8 * 14 + 60;
const LAST_X = WIDE_CANDLES[WIDE_CANDLES.length - 1].x;

/** Every tenth bar carries a clock label, as a platform would space them. */
const TIME_TICKS = BARS.map((_, index) => index)
  .filter((index) => index % 10 === 0)
  .map((index) => ({
    index,
    x: index * 14 + 60,
    label: barTimeLabel(index),
  }));

/* The readout along the top. Both figures come from the last bar in the
   window and the one before it — nothing here is decided by hand. */
const LAST = BARS[BARS.length - 1];
const PREVIOUS_CLOSE = BARS[BARS.length - 2][3];
const LAST_UP = LAST[3] >= PREVIOUS_CLOSE;

const LAST_BAR = [
  { key: "O", value: LAST[0] },
  { key: "H", value: LAST[1] },
  { key: "L", value: LAST[2] },
  { key: "C", value: LAST[3] },
] as const;

const LAST_CHANGE = (() => {
  const delta = LAST[3] - PREVIOUS_CLOSE;
  const percent = (delta / PREVIOUS_CLOSE) * 100;
  const sign = delta >= 0 ? "+" : "−";
  return `${sign}${Math.abs(delta).toFixed(2)} (${sign}${Math.abs(percent).toFixed(2)}%)`;
})();

/* ========================================================================== */
/* Floating badges — real glass, outside every 3D context                     */
/* ========================================================================== */

/**
 * The AI verdict, as the product states it: a grade, and the one rule that
 * decided it. Not a chat bubble — the point is that the judgement is short
 * enough to act on.
 */
function GradeBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[14.5rem] rounded-2xl border border-black/[0.07] bg-white/70 p-3.5 backdrop-blur-2xl",
        "dark:border-white/[0.09] dark:bg-white/[0.06]",
        "shadow-[0_1px_1px_rgb(0_0_0/0.04),0_12px_28px_-10px_rgb(16_24_40/0.22),0_36px_72px_-36px_rgb(16_24_40/0.3)]",
        "dark:shadow-[0_1px_2px_rgb(0_0_0/0.6),0_14px_34px_-10px_rgb(0_0_0/0.7),0_40px_80px_-40px_rgb(0_0_0/1)]",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <BrainCircuit className="size-4" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <p className="text-[12.5px] font-medium tracking-tight text-fg">
          Execution review
        </p>
        <span className="stat ml-auto text-[17px] text-positive">A+</span>
      </div>
      <p className="mt-2.5 text-[12px] leading-snug text-fg-muted">
        Entry at the level you wrote down. Stop never moved.
      </p>
    </div>
  );
}

/**
 * The number a trader checks first, with the bar underneath so the figure has
 * a shape as well as a value.
 */
function WinRateBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[13rem] rounded-2xl border border-black/[0.07] bg-white/70 p-3.5 backdrop-blur-2xl",
        "dark:border-white/[0.09] dark:bg-white/[0.06]",
        "shadow-[0_1px_1px_rgb(0_0_0/0.04),0_12px_28px_-10px_rgb(16_24_40/0.22),0_36px_72px_-36px_rgb(16_24_40/0.3)]",
        "dark:shadow-[0_1px_2px_rgb(0_0_0/0.6),0_14px_34px_-10px_rgb(0_0_0/0.7),0_40px_80px_-40px_rgb(0_0_0/1)]",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[12.5px] font-medium tracking-tight text-fg">
          London breakout
        </p>
        <span className="stat text-[17px] text-fg">68.4%</span>
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.07] dark:bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-positive shadow-[0_0_12px_-2px_var(--positive)]"
          style={{ width: "68.4%" }}
        />
      </div>
      <p className="mt-2 text-[11.5px] text-fg-subtle">
        <span className="numeric">41</span> of{" "}
        <span className="numeric">60</span> setups taken
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Desktop: the wide terminal, behind the copy                                */
/* ========================================================================== */

export function HeroChart() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-canvas">
      {/* The floor the terminal hovers above. First in the layer, so every
          glow, panel and fade below paints over it. */}
      <div className="sv-floor" aria-hidden="true">
        <div className="sv-floor-tilt">
          <div className="sv-floor-plane" />
        </div>
        <div className="sv-floor-glow" />
        <div className="sv-floor-fade" />
      </div>

      {/* Ambient light, sized down hard on phones: 35rem of blur on a 390px
          screen washes out the whole hero rather than lighting it. */}
      <div className="absolute left-1/4 top-1/4 size-[15rem] rounded-full bg-accent/[0.13] blur-[70px] sm:size-[34rem] sm:blur-[110px]" />
      <div className="absolute bottom-1/4 right-1/4 size-[13rem] rounded-full bg-positive/[0.08] blur-[70px] sm:size-[28rem] sm:blur-[110px]" />

      {/* Only from `lg`: at tablet widths this crowds the headline, and below
          that the vertical panel replaces it entirely. */}
      <div
        // Held at just over half strength. Real price action fills the frame
        // far more densely than the generated series it replaced, and at full
        // opacity it competes with the headline sitting on top of it. The
        // badges and the floor keep their own weight; only the terminal drops.
        className="absolute left-1/2 top-1/2 hidden h-[800px] w-[110vw] max-w-[1400px] -translate-x-1/2 -translate-y-1/2 opacity-[0.55] lg:block lg:min-w-[1000px] lg:scale-[0.88] xl:scale-100"
        style={PERSPECTIVE_WIDE}
      >
        <div className="sv-tilt-wide relative h-full w-full" style={WEBKIT_3D}>
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            // A loop wants a symmetric ease; a spring would make it lurch.
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            // Opaque, and with no backdrop-filter: see the note at the top.
            className="flex h-full w-full flex-col overflow-hidden rounded-[20px] border border-black/[0.06] bg-surface dark:border-white/[0.07]"
            style={{ boxShadow: "var(--shadow-floating)" }}
          >
            <div className="flex h-12 items-center gap-6 border-b border-black/[0.05] px-4 text-[11.5px] text-fg-subtle dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
                </span>
                {INSTRUMENT}
              </div>
              <span className="h-4 w-px bg-black/[0.07] dark:bg-white/[0.08]" />
              <div className="numeric flex gap-3.5">
                <span>1m</span>
                <span>5m</span>
                <span className="text-accent">15m</span>
                <span>1H</span>
              </div>
              <span className="h-4 w-px bg-black/[0.07] dark:bg-white/[0.08]" />
              <span className="flex items-center gap-1.5 text-accent">
                <Activity className="size-3.5" strokeWidth={1.7} /> Indicators
              </span>
              <div className="ml-auto flex gap-3.5">
                <Search className="size-4" strokeWidth={1.7} />
                <Maximize className="size-4" strokeWidth={1.7} />
              </div>
            </div>

            <div className="flex flex-1">
              <div className="flex w-12 flex-col items-center gap-5 border-r border-black/[0.05] py-4 text-fg-muted/50 dark:border-white/[0.06]">
                <MousePointer2 className="size-4 text-accent" strokeWidth={1.7} />
                <Crosshair className="size-4" strokeWidth={1.7} />
                <Pencil className="size-4" strokeWidth={1.7} />
                <LineChart className="size-4" strokeWidth={1.7} />
                <Ruler className="size-4" strokeWidth={1.7} />
                <div className="mt-auto pb-2">
                  <Settings2 className="size-4" strokeWidth={1.7} />
                </div>
              </div>

              <div className="relative flex-1 overflow-hidden">
                {/* The symbol sits behind the price, the way every terminal
                    marks a chart that belongs to a workspace. */}
                <p
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-[5rem] font-semibold tracking-tight text-fg opacity-[0.03]"
                >
                  {INSTRUMENT}
                </p>

                {/* The OHLC readout. A chart without one is a picture of a
                    chart; this is the line a trader's eye goes to first. */}
                <div className="numeric pointer-events-none absolute left-3 top-2.5 z-10 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[10.5px]">
                  <span className="text-[11px] font-semibold tracking-tight text-fg">
                    {INSTRUMENT}
                  </span>
                  <span className="text-fg-subtle">15m</span>
                  {LAST_BAR.map((field) => (
                    <span key={field.key} className="text-fg-subtle">
                      {field.key}
                      <span
                        className={
                          LAST_UP ? "ml-1 text-positive" : "ml-1 text-negative"
                        }
                      >
                        {field.value}
                      </span>
                    </span>
                  ))}
                  <span className={LAST_UP ? "text-positive" : "text-negative"}>
                    {LAST_CHANGE}
                  </span>
                </div>

                <svg
                  viewBox="0 0 1000 600"
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {/* Gridlines land on the axis prices and on the time ticks,
                      so every line in the chart means something. A grid of
                      even squares is wallpaper. */}
                  {WIDE_AXIS.map((price) => (
                    <line
                      key={`h${price}`}
                      x1="0"
                      x2="1000"
                      y1={yPrice(price)}
                      y2={yPrice(price)}
                      className="stroke-border"
                      strokeWidth="1"
                      opacity="0.55"
                    />
                  ))}
                  {TIME_TICKS.map((tick) => (
                    <line
                      key={`v${tick.index}`}
                      x1={tick.x}
                      x2={tick.x}
                      y1="0"
                      y2={VOL_TOP + VOL_H}
                      className="stroke-border"
                      strokeWidth="1"
                      opacity="0.4"
                    />
                  ))}

                  {/* The long-position tool, drawn from the setup's own
                      numbers: reward above the entry, risk below it. Its
                      proportions are the risk-to-reward, not a shape chosen
                      to look good. */}
                  <g className="opacity-60">
                    <rect
                      x={ENTRY_X}
                      y={Y_TARGET}
                      width={700 - ENTRY_X}
                      height={Y_ENTRY - Y_TARGET}
                      className="fill-positive-soft stroke-positive/45"
                      strokeWidth="1.5"
                    />
                    <rect
                      x={ENTRY_X}
                      y={Y_ENTRY}
                      width={700 - ENTRY_X}
                      height={Y_STOP - Y_ENTRY}
                      className="fill-negative-soft stroke-negative/45"
                      strokeWidth="1.5"
                    />
                    <line
                      x1={ENTRY_X - 16}
                      y1={Y_ENTRY}
                      x2="716"
                      y2={Y_ENTRY}
                      stroke="var(--fg-muted)"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                    />
                    <text
                      x={668}
                      y={Y_TARGET + 34}
                      textAnchor="end"
                      className="fill-positive font-mono text-[22px] font-semibold"
                    >
                      {RISK_REWARD_LABEL}
                    </text>
                  </g>

                  {/* Candles. The wick is a hair, the body is six units wide
                      — the proportions a charting platform actually uses. */}
                  <g>
                    {WIDE_CANDLES.map((candle, i) => (
                      <g key={i}>
                        <line
                          x1={candle.x}
                          y1={candle.high}
                          x2={candle.x}
                          y2={candle.low}
                          stroke={
                            candle.isBull ? "var(--positive)" : "var(--negative)"
                          }
                          strokeWidth="1"
                        />
                        <rect
                          x={candle.x - 3}
                          y={Math.min(candle.open, candle.close)}
                          width="6"
                          height={Math.max(1, Math.abs(candle.close - candle.open))}
                          className={candle.isBull ? "fill-positive" : "fill-negative"}
                        />
                      </g>
                    ))}
                  </g>

                  {/* Volume, on its own pane under the price. The spike is the
                      bar that broke the range — which is the point of drawing
                      it at all. */}
                  <g className="opacity-45">
                    {WIDE_CANDLES.map((candle, i) => {
                      const height = VOLUME_SHARE[i] * VOL_H;
                      return (
                        <rect
                          key={`v${i}`}
                          x={candle.x - 3}
                          y={VOL_TOP + VOL_H - height}
                          width="6"
                          height={Math.max(height, 1)}
                          className={candle.isBull ? "fill-positive" : "fill-negative"}
                        />
                      );
                    })}
                  </g>

                  {/* The live price. It no longer drifts: the tag shows the
                      session's actual last close, and a line that slides while
                      its own label stays put reads as a bug. The pulse carries
                      the sense of a live feed instead. */}
                  <g>
                    <line
                      x1="0"
                      y1={Y_LIVE}
                      x2="1000"
                      y2={Y_LIVE}
                      stroke="var(--positive)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      className="opacity-70"
                    />
                    <circle cx={LAST_X} cy={Y_LIVE} r="3" className="fill-positive" />
                    <circle cx={LAST_X} cy={Y_LIVE} r="9" className="fill-positive opacity-40">
                      <animate
                        attributeName="r"
                        values="5; 15; 5"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.55; 0; 0.55"
                        dur="2.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                </svg>

                {/* The price scale. Its labels are positioned at the real
                    height of each gridline rather than spread evenly, which is
                    the detail that stops a mock chart reading as a mock. */}
                <div className="numeric absolute bottom-0 right-0 top-0 w-[4.5rem] border-l border-black/[0.05] bg-surface text-[10px] text-fg-subtle dark:border-white/[0.06]">
                  {WIDE_AXIS.map((price) => (
                    <span
                      key={price}
                      className="absolute left-0 right-0 -translate-y-1/2 text-center"
                      style={{ top: `${(yPrice(price) / 600) * 100}%` }}
                    >
                      {price}
                    </span>
                  ))}

                  <span
                    className="absolute left-1 right-1 -translate-y-1/2 rounded-[3px] bg-positive py-0.5 text-center text-[10px] font-semibold text-white"
                    style={{ top: `${(Y_LIVE / 600) * 100}%` }}
                  >
                    {LIVE}
                  </span>
                </div>

                {/* The clock, in the exchange's timezone. */}
                <div className="numeric pointer-events-none absolute bottom-0 left-0 right-[4.5rem] h-5 border-t border-black/[0.05] text-[9.5px] text-fg-subtle dark:border-white/[0.06]">
                  {TIME_TICKS.map((tick) => (
                    <span
                      key={tick.index}
                      className="absolute top-0.5 -translate-x-1/2"
                      style={{ left: `${(tick.x / 1000) * 100}%` }}
                    >
                      {tick.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* The glass sits here, outside the tilt, where WebKit will keep it.
          Only from `xl`: below that the badges would land on the copy. */}
      <motion.div
        animate={{ y: [-10, 6, -10] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[7%] top-[26%] hidden xl:block"
      >
        <GradeBadge />
      </motion.div>
      <motion.div
        animate={{ y: [8, -8, 8] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[22%] right-[17%] hidden xl:block"
      >
        <WinRateBadge />
      </motion.div>

      {/* The copy side gets its own scrim. The terminal is drawn from real
          data now, which makes it considerably busier than the generated
          series it replaced — busy enough to compete with the headline sitting
          on top of it. This quiets the left half and leaves the right, where
          the glass badges are, alone. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[58%] bg-gradient-to-r from-canvas via-canvas/96 to-transparent lg:block" />

      {/* Edge fades, so the terminal dissolves into the page rather than
          ending on a hard rectangle behind the copy. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--canvas)_8%,transparent_62%)] opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-canvas via-canvas/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-canvas to-transparent" />
    </div>
  );
}

/* ========================================================================== */
/* Phone and tablet: the same series, composed vertically, in page flow       */
/* ========================================================================== */

/* The phone shows the tail of the same session, rescaled to its own window:
   fourteen bars across 335px need the full height to stay readable, and the
   sixty-bar range would flatten them into a line. */
const MOBILE_SLICE = BARS.slice(-14);

const MOBILE = (() => {
  const lo = Math.min(...MOBILE_SLICE.map((b) => b[2]));
  const hi = Math.max(...MOBILE_SLICE.map((b) => b[1]));
  const pad = (hi - lo) * 0.12;
  const min = lo - pad;
  const span = hi - lo + pad * 2;
  const toY = (price: number) => 202 - ((price - min) / span) * 184;

  return {
    toY,
    bars: MOBILE_SLICE.map(([o, h, l, c], index) => ({
      cx: 20 + index * 17,
      open: toY(o),
      close: toY(c),
      high: toY(h),
      low: toY(l),
      isBull: c >= o,
    })),
    // Three readings across the window, on a round grid.
    axis: [hi, (hi + lo) / 2, lo].map((v) => Math.round(v / 25) * 25),
  };
})();

export function HeroChartMobile({ className }: { className?: string }) {
  const bars = MOBILE.bars;

  return (
    <div className={cn("relative", className)}>
      <div style={PERSPECTIVE_NARROW}>
        {/* Proportional shrink rather than a reflow: the panel keeps its tilt
            and its internal proportions, and simply sits smaller on a phone. */}
        <div
          className="sv-tilt-narrow origin-top scale-[0.92] min-[400px]:scale-100"
          style={WEBKIT_3D}
        >
          <motion.div
            // A phone shows one layer, not three, so there is no parallax to
            // read the motion against — and ±6px over 9s on a 0.92-scaled
            // panel is about a pixel a second, which the eye does not register
            // as movement at all. More travel, a shorter cycle, and a little
            // yaw so the drift reads as 3D rather than as a lift.
            animate={{ y: [-14, 14, -14], rotateY: [-1.3, 1.3, -1.3] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            className="overflow-hidden rounded-[18px] border border-black/[0.06] bg-surface dark:border-white/[0.07]"
            style={{
              boxShadow: "var(--shadow-floating)",
              // iOS composites a perpetually transformed layer far more
              // willingly when it is promoted up front and told to keep its
              // own 3D context.
              willChange: "transform",
              ...WEBKIT_3D,
            }}
          >
            <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 dark:border-white/[0.06]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
              </span>
              <span className="text-[13px] font-semibold tracking-tight text-fg">
                {INSTRUMENT}
              </span>
              <span className="numeric text-[11px] text-accent">15m</span>
              <span className="ml-auto text-[11.5px] font-medium text-positive">
                Long
              </span>
            </div>

            <svg
              viewBox="0 0 320 220"
              // Width and height as attributes too: they give the element an
              // intrinsic size, so it cannot collapse to zero height on a
              // browser that does not infer one from the viewBox alone.
              width="320"
              height="220"
              className="block h-auto w-full"
              role="img"
              aria-label={`Example ${INSTRUMENT} candlestick chart with entry, live price and target`}
            >
              {MOBILE.axis.map((price) => (
                <line
                  key={price}
                  x1="0"
                  x2="262"
                  y1={MOBILE.toY(price)}
                  y2={MOBILE.toY(price)}
                  className="stroke-border"
                  strokeWidth="1"
                />
              ))}

              {bars.map((bar, index) => (
                <g key={index}>
                  <line
                    x1={bar.cx}
                    x2={bar.cx}
                    y1={bar.high}
                    y2={bar.low}
                    className={bar.isBull ? "stroke-positive" : "stroke-negative"}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <rect
                    x={bar.cx - 6}
                    y={Math.min(bar.open, bar.close)}
                    width="12"
                    height={Math.max(Math.abs(bar.close - bar.open), 3)}
                    rx="2"
                    className={bar.isBull ? "fill-positive" : "fill-negative"}
                  />
                </g>
              ))}

              <line
                x1="262"
                x2="262"
                y1="8"
                y2="212"
                className="stroke-border"
                strokeWidth="1"
              />
              {MOBILE.axis.map((price) => (
                <text
                  key={price}
                  x="268"
                  y={MOBILE.toY(price) + 3}
                  className="fill-fg-subtle font-mono"
                  fontSize="9"
                >
                  {price}
                </text>
              ))}

              <g>
                <line
                  x1="0"
                  x2="262"
                  y1={MOBILE.toY(LEVELS.live)}
                  y2={MOBILE.toY(LEVELS.live)}
                  className="stroke-accent"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <rect
                  x="262"
                  y={MOBILE.toY(LEVELS.live) - 9}
                  width="56"
                  height="18"
                  rx="3"
                  className="fill-accent"
                />
                <text
                  x="290"
                  y={MOBILE.toY(LEVELS.live) + 3.5}
                  textAnchor="middle"
                  className="fill-accent-fg font-mono"
                  fontSize="10"
                  fontWeight="600"
                >
                  {LIVE}
                </text>
              </g>
            </svg>

            <div className="grid grid-cols-3 divide-x divide-black/[0.05] border-t border-black/[0.05] dark:divide-white/[0.06] dark:border-white/[0.06]">
              {[
                { label: "Entry", value: ENTRY },
                { label: "Risk / reward", value: RISK_REWARD_LABEL },
                { label: "Setup score", value: "88" },
              ].map((item) => (
                <div key={item.label} className="px-3 py-3">
                  <p className="truncate text-[11px] text-fg-subtle">{item.label}</p>
                  <p className="numeric mt-1 text-[15px] font-semibold tracking-tight text-fg">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Glass, again outside the tilted node. On a phone there is no room to
          float it: anything overlapping this panel lands on the three figures
          along its bottom edge, so below `sm` the badge simply sits under the
          chart and floats only once there is width to float in. */}
      <motion.div
        // Deliberately out of phase with the panel above and on a different
        // period, so the two surfaces separate instead of moving as one block.
        // That counter-motion is what makes the depth legible on a phone.
        animate={{ y: [9, -9, 9] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ willChange: "transform" }}
        className="mt-4 flex justify-center sm:absolute sm:-bottom-24 sm:-left-4 sm:mt-0 sm:block"
      >
        <GradeBadge className="w-full max-w-[20rem] sm:w-[14.5rem]" />
      </motion.div>
    </div>
  );
}
