import { cn } from "@/lib/utils";
import {
  BARS,
  LEVELS,
  RISK_REWARD_LABEL,
  SESSION,
  VOLUMES,
  barTimeLabel,
  volumeScale,
} from "@/features/marketing/data/nq-session";

/**
 * The chart, drawn from the session itself.
 *
 * What was here before was seven hand-placed rectangles — the shape of a
 * chart rather than a chart. Meanwhile `nq-session.ts` has been sitting in
 * this folder holding sixty real NQ100 fifteen-minute bars pulled from Yahoo
 * Finance, with their volumes, their timestamps and a price scaler, and the
 * hero has been drawing from it all along. So this draws from it too.
 *
 * That single change is most of the realism. Price is genuinely hard to fake:
 * the long dull stretches, the one bar that does half the range, the wick
 * that takes out the low and reverses. A trader reads invented candles in
 * about a second — the give-away is that every bar is interesting, because
 * someone placed each one on purpose. Here bar 22 is the breakout and bars
 * 18 through 21 are nothing happening, which is what a real session looks
 * like.
 *
 * Everything quantitative is derived, never typed: the grid lines come from
 * the scale below, every candle from the real OHLC, the volume pane from
 * `volumeScale`, the clock labels from the real bar timestamps, and the R
 * multiple on the position tool from `(target - entry) / (entry - stop)`.
 * Replace the window in the data file and all of it follows.
 *
 * It is a server component on purpose. It is the heaviest piece of markup on
 * the page and none of it is interactive, so there is no reason for any of
 * it to reach the client bundle.
 *
 * Note on the instrument: the brief suggested labelling this "DAX 1m". The
 * prices in this file are NQ100's — they sit around 30,080, where the DAX
 * does not trade — and the thesis card beside the chart refers to the 15m
 * reclaim. Relabelling would make the mockup internally false in exactly the
 * way the people it is aimed at notice first, so the instrument and the
 * timeframe stay as the data has them.
 */

/* Geometry. One coordinate system, stated once. */
const W = 400;
const PRICE_H = 170;
const VOL_TOP = 184;
const VOL_H = 44;
const H = VOL_TOP + VOL_H;

const PAD_X = 7;
const STEP = (W - PAD_X * 2) / BARS.length;
const BODY = Math.max(STEP * 0.62, 2.4);

/**
 * The vertical scale, which has to include the drawn levels and not just the
 * bars.
 *
 * The shared `priceScaler` fits the candles alone, and the stop at 29,940
 * sits below every low in the window — so the risk half of the position tool
 * was being drawn past the bottom of the price pane and straight through the
 * volume histogram. A real chart auto-scales to whatever you have drawn on
 * it; this does the same by taking the union of the bars and the levels
 * before padding.
 */
const LOW = Math.min(...BARS.map((b) => b[2]), LEVELS.stop);
const HIGH = Math.max(...BARS.map((b) => b[1]), LEVELS.target);
const PAD_Y = (HIGH - LOW) * 0.06;
const MIN = LOW - PAD_Y;
const SPAN = HIGH - LOW + PAD_Y * 2;

const y = (price: number) => PRICE_H - ((price - MIN) / SPAN) * PRICE_H;
const vol = volumeScale();
const x = (i: number) => PAD_X + i * STEP + STEP / 2;

/** Round gridlines across the scale actually in use. */
const GRID = (() => {
  const step = Math.round(SPAN / 5 / 25) * 25 || 25;
  const first = Math.ceil((MIN + PAD_Y / 2) / step) * step;
  const out: number[] = [];
  for (let p = first; p < MIN + SPAN - PAD_Y / 4; p += step) out.push(p);
  return out;
})();

/** Where the reclaim is, and so where the position tool starts. */
const ENTRY_INDEX = 9;
const TIME_MARKS = [6, 20, 34, 48];

const TIMEFRAMES = ["1m", "5m", "15m", "1H"] as const;
const INDICATORS = ["EMA 9", "EMA 21", "VWAP"] as const;

export function CaptureChart() {
  const entryY = y(LEVELS.entry);
  const stopY = y(LEVELS.stop);
  const targetY = y(LEVELS.target);
  const boxX = x(ENTRY_INDEX);

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 border-b border-black/[0.05] px-2.5 py-1.5 dark:border-white/[0.06]">
        <span className="text-[11px] font-semibold tracking-tight text-fg">
          {SESSION.label}
        </span>

        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden="true" />

        {/* Timeframes. The active one is the interval the data actually is,
            and the one the thesis beside the chart refers to. */}
        <span className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <span
              key={tf}
              className={cn(
                "numeric rounded px-1 py-px text-[9px] leading-[1.4]",
                tf === SESSION.interval
                  // The token for accent text on an accent tint. Plain
                  // --accent measures 4.21:1 here at 9px: the tint lifts the
                  // background towards the text, which is the whole reason
                  // this token exists.
                  ? "bg-accent-soft font-semibold text-accent-on-soft"
                  : "text-fg-subtle",
              )}
            >
              {tf}
            </span>
          ))}
        </span>

        <span className="mx-0.5 h-3 w-px bg-border" aria-hidden="true" />

        {/* Indicator chips. Hidden on the narrowest panel, where the row
            would wrap and take a line off the chart itself. */}
        <span className="hidden items-center gap-1 min-[420px]:flex">
          {INDICATORS.map((name) => (
            <span
              key={name}
              className="numeric rounded border border-border px-1 py-px text-[8.5px] leading-[1.4] text-fg-subtle"
            >
              {name}
            </span>
          ))}
        </span>

        <span className="numeric ml-auto text-[10px] font-medium text-fg">
          {LEVELS.live.toLocaleString("en-US")}
        </span>
        <span className="numeric rounded bg-positive-soft px-1 py-px text-[8.5px] font-medium text-positive">
          +0.21%
        </span>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block h-full w-full"
          role="img"
          aria-label={`${SESSION.label} ${SESSION.interval} candles with a long position from ${LEVELS.entry} to ${LEVELS.target}, stop at ${LEVELS.stop}, ${RISK_REWARD_LABEL}`}
        >
          {/* Grid. Horizontals on the price levels the axis labels name, so
              the two agree; verticals on the hours. */}
          <g className="stroke-fg" strokeWidth="0.5" opacity="0.07">
            {GRID.map((price) => (
              <line key={price} x1="0" x2={W} y1={y(price)} y2={y(price)} />
            ))}
            {TIME_MARKS.map((i) => (
              <line key={i} x1={x(i)} x2={x(i)} y1="0" y2={PRICE_H} />
            ))}
          </g>

          {/* The long-position tool: reward above the entry, risk below it. */}
          <rect
            x={boxX}
            y={targetY}
            width={W - boxX}
            height={entryY - targetY}
            className="fill-positive/[0.09] stroke-positive/50"
            strokeWidth="0.8"
          />
          <rect
            x={boxX}
            y={entryY}
            width={W - boxX}
            height={stopY - entryY}
            className="fill-negative/[0.12] stroke-negative/50"
            strokeWidth="0.8"
          />
          <line
            x1="0"
            x2={W}
            y1={entryY}
            y2={entryY}
            className="stroke-fg-muted"
            strokeWidth="0.9"
            strokeDasharray="4 3"
          />

          {/* Candles. */}
          {BARS.map(([open, high, low, close], i) => {
            const bull = close >= open;
            const cx = x(i);
            const top = y(Math.max(open, close));
            const bottom = y(Math.min(open, close));
            return (
              <g
                key={i}
                className={bull ? "fill-positive stroke-positive" : "fill-negative stroke-negative"}
              >
                <line
                  x1={cx}
                  x2={cx}
                  y1={y(high)}
                  y2={y(low)}
                  strokeWidth="0.7"
                />
                <rect
                  x={cx - BODY / 2}
                  y={top}
                  width={BODY}
                  // A doji still has to be visible, so the body never
                  // collapses to nothing.
                  height={Math.max(bottom - top, 0.8)}
                />
              </g>
            );
          })}

          {/* Volume, in its own pane under a hairline. */}
          <line
            x1="0"
            x2={W}
            y1={VOL_TOP - 7}
            y2={VOL_TOP - 7}
            className="stroke-fg"
            strokeWidth="0.5"
            opacity="0.09"
          />
          {VOLUMES.map((v, i) => {
            const [open, , , close] = BARS[i];
            const h = Math.max(vol(v) * VOL_H, 0.6);
            return (
              <rect
                key={i}
                x={x(i) - BODY / 2}
                y={VOL_TOP + VOL_H - h}
                width={BODY}
                height={h}
                className={close >= open ? "fill-positive" : "fill-negative"}
                opacity="0.38"
              />
            );
          })}

          {/* The R multiple, on its own plate: candles run straight through
              this part of the box, and a number half-behind one is worse
              than no number at all. */}
          <g>
            <rect
              x={(boxX + W) / 2 - 27}
              y={(targetY + entryY) / 2 - 11}
              width="54"
              height="22"
              rx="4"
              className="fill-surface stroke-positive/35"
              strokeWidth="0.8"
            />
            <text
              x={(boxX + W) / 2}
              y={(targetY + entryY) / 2 + 5}
              textAnchor="middle"
              className="fill-positive font-mono text-[13px] font-semibold"
            >
              {RISK_REWARD_LABEL}
            </text>
          </g>
        </svg>

        {/* Price axis. DOM rather than SVG text, so the numerals stay crisp
            instead of being stretched by preserveAspectRatio="none". */}
        <div className="numeric relative w-10 shrink-0 border-l border-black/[0.05] text-[7.5px] text-fg-subtle dark:border-white/[0.06]">
          {GRID.map((price) => (
            <span
              key={price}
              className="absolute right-1 -translate-y-1/2"
              style={{ top: `${(y(price) / H) * 100}%` }}
            >
              {price.toLocaleString("en-US")}
            </span>
          ))}
          <span
            className="absolute right-0.5 -translate-y-1/2 rounded bg-accent px-1 py-px font-medium text-accent-fg"
            style={{ top: `${(y(LEVELS.live) / H) * 100}%` }}
          >
            {LEVELS.live.toLocaleString("en-US")}
          </span>
        </div>
      </div>

      {/* ── Time axis ───────────────────────────────────────────────────── */}
      <div className="numeric relative h-4 shrink-0 border-t border-black/[0.05] text-[7.5px] text-fg-subtle dark:border-white/[0.06]">
        {TIME_MARKS.map((i) => (
          <span
            key={i}
            className="absolute top-0.5 -translate-x-1/2"
            // The marks are chosen inset from both ends (bars 6..48 of 60),
            // so a centred label cannot hang past the frame and there is no
            // nudge factor to tune.
            style={{ left: `${(x(i) / W) * 100}%` }}
          >
            {barTimeLabel(i)}
          </span>
        ))}
      </div>
    </div>
  );
}
