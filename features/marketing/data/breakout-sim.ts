/**
 * The hero's price simulation.
 *
 * Illustrative demo data. It is not a market feed, not a backtest, and not a
 * claim that SetupVault predicts breakouts — it is a short, fixed story about
 * one setup, told so the page can demonstrate what the product records.
 *
 * Two rules shape it:
 *
 * 1. Deterministic. The series is generated once at module load from a seeded
 *    generator against a hand-drawn path, never per frame. Randomising each
 *    frame produces noise that reads as a screensaver; a fixed sequence can
 *    be composed — the range is dull on purpose, one candle does most of the
 *    work, and the gap it leaves behind is the thing the setup is about.
 *
 * 2. No React. Everything here is plain numbers. The renderer reads frames
 *    from it inside a rAF loop and writes to the DOM directly, so a running
 *    animation costs no renders.
 */

/* ── The story ───────────────────────────────────────────────────────────── */

export const INSTRUMENT = "XAUUSD";
export const PLAY = "London breakout";

/** The level the range keeps failing at, until it does not. */
export const KEY_LEVEL = 2438.5;
/** Where the simulated move ends. */
export const FINAL_PRICE = 2454.8;
/** Illustrative reward against the planned risk. Decorative, and labelled. */
export const R_MULTIPLE = "+3.42R";

export const ENTRY = 2439.2;
export const STOP = 2434.4;

const COUNT = 52;

/* ── Generation ──────────────────────────────────────────────────────────── */

/** A tiny LCG. Seeded, so every visitor sees the same session. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * The spine the candles hang on: a flat range that fails at the level twice,
 * one impulse through it, then a measured run that decelerates into the
 * close. Drawn rather than simulated, because the shape is the point.
 */
function spine(i: number): number {
  if (i < 18) {
    // Range. Two pushes at the level that do not hold.
    const wave = Math.sin(i * 0.55) * 3.1 + Math.sin(i * 0.23) * 1.6;
    return 2430.6 + wave;
  }
  if (i < 26) {
    // Coiling: the range tightens under the level, which is what makes the
    // break read as a release rather than as drift.
    const t = (i - 18) / 8;
    return 2433.4 + t * 3.4 + Math.sin(i * 0.9) * (1.5 - t * 1.1);
  }
  if (i < 33) {
    // The impulse, with a deliberate step at the break. The step is the
    // whole point: it opens a gap between the high before it and the low
    // after it that price never trades back into, and that imbalance is what
    // the setup is named for. Without it the FVG zone measured a quarter of
    // a point and would have rendered as a hairline.
    const t = (i - 26) / 7;
    return 2436.9 + t * t * 9.6 + (i >= 29 ? 2.9 : 0);
  }
  // Momentum, easing out so the last candles settle rather than stop dead.
  const t = Math.min((i - 33) / (COUNT - 1 - 33), 1);
  const eased = 1 - Math.pow(1 - t, 2.1);
  return 2446.5 + eased * (FINAL_PRICE - 2446.5);
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  bull: boolean;
}

function build(): Candle[] {
  const random = rng(20261022);
  const out: Candle[] = [];
  let previousClose = spine(0);

  for (let i = 0; i < COUNT; i++) {
    const target = spine(i);
    const open = previousClose;

    // Impulse candles have bigger bodies and shorter wicks; range candles are
    // the opposite. That contrast is most of what makes a chart look real.
    const impulse = i >= 26 && i < 36;
    const body = target - open;
    const spread = impulse ? 1.5 + random() * 1.4 : 1.9 + random() * 2.2;

    const close = target + (random() - 0.5) * (impulse ? 0.5 : 1.1);
    const high = Math.max(open, close) + random() * spread * (impulse ? 0.45 : 1);
    const low = Math.min(open, close) - random() * spread * (impulse ? 0.35 : 1);

    out.push({
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      bull: close >= open,
    });
    previousClose = close;
    void body;
  }

  // The series advertises a final price, so it ends on it exactly rather
  // than near it.
  const last = out[COUNT - 1];
  last.close = FINAL_PRICE;
  last.high = Math.max(last.high, FINAL_PRICE);
  last.bull = last.close >= last.open;
  return out;
}

const round = (v: number) => Math.round(v * 100) / 100;

export const CANDLES: readonly Candle[] = build();

/* ── Derived series ──────────────────────────────────────────────────────── */

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    prev = i === 0 ? values[0] : values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

const closes = CANDLES.map((c) => c.close);
/** Two bands rather than five: a ribbon that reads as support, not as spaghetti. */
export const EMA_FAST: readonly number[] = ema(closes, 9);
export const EMA_SLOW: readonly number[] = ema(closes, 21);

/**
 * The imbalance the impulse leaves behind: the gap between the high before it
 * and the low after it, which price never returned to fill. It is the reason
 * the setup has a name, so the chart marks it.
 */
export const FVG = (() => {
  // The widest gap, not the first. Taking the first match found a 0.25-point
  // hairline a couple of candles before the real imbalance and would have
  // drawn the zone in the wrong place, at a height nobody could see.
  let best = { from: 28, to: 30, low: 0, high: 0, size: 0 };
  for (let i = 26; i < 38; i++) {
    const before = CANDLES[i - 1];
    const after = CANDLES[i + 1];
    if (!before || !after) continue;
    const size = after.low - before.high;
    if (size > best.size) {
      best = { from: i - 1, to: i + 1, low: before.high, high: after.low, size };
    }
  }
  return best;
})();

/* ── The state machine ───────────────────────────────────────────────────── */

export type Phase = "consolidation" | "breakout" | "momentum" | "settle";

/** The candle at which price first closes above the level. */
export const BREAK_INDEX = CANDLES.findIndex((c) => c.close > KEY_LEVEL);
/** Where the measured move completes. */
export const TARGET_INDEX = COUNT - 6;

/**
 * Timings, in seconds, for one full cycle. Phases are expressed as a count of
 * candles revealed per second so the chart's pace reads as market pace: slow
 * through the range, quick through the break, deliberate on the way out.
 */
const PACE = [
  { until: 18, perSecond: 4.2 },
  { until: 26, perSecond: 2.6 },
  { until: 36, perSecond: 5.4 },
  { until: COUNT, perSecond: 3.4 },
] as const;

/** Seconds to reveal up to and including candle `index`. */
function timeFor(index: number): number {
  let t = 0;
  let from = 0;
  for (const leg of PACE) {
    const to = Math.min(index, leg.until);
    if (to > from) t += (to - from) / leg.perSecond;
    from = Math.max(from, to);
    if (from >= index) break;
  }
  return t;
}

export const REVEAL_SECONDS = timeFor(COUNT);
/** Time held on the finished chart before the cycle restarts. */
export const HOLD_SECONDS = 4.2;
/** The fade out and back in. Short, and eased, so the reset never pops. */
export const RESET_SECONDS = 1.1;
export const CYCLE_SECONDS = REVEAL_SECONDS + HOLD_SECONDS + RESET_SECONDS;

export interface Frame {
  /** How many candles are drawn. The last one is still forming. */
  count: number;
  /** 0–1 through the forming candle, for its body to grow. */
  partial: number;
  phase: Phase;
  /** The price the axis tag shows. */
  price: number;
  /** 1 while the chart is up, easing to 0 across the reset. */
  opacity: number;
  /** True once price has closed above the level in this cycle. */
  broken: boolean;
  /** True once the measured move has completed. */
  reachedTarget: boolean;
  /** True on the final settled state. */
  complete: boolean;
}

function phaseFor(index: number): Phase {
  if (index < 26) return "consolidation";
  if (index < 36) return "breakout";
  if (index < TARGET_INDEX) return "momentum";
  return "settle";
}

/** Inverse of `timeFor`: seconds elapsed → fractional candle index. */
function indexAt(seconds: number): number {
  let t = 0;
  let from = 0;
  for (const leg of PACE) {
    const span = (leg.until - from) / leg.perSecond;
    if (seconds <= t + span) return from + (seconds - t) * leg.perSecond;
    t += span;
    from = leg.until;
  }
  return COUNT;
}

/**
 * The whole simulation, as a pure function of elapsed time. No internal
 * state, so it can be called from a rAF loop, from a test, or from a static
 * render at a fixed instant — which is exactly what reduced motion does.
 */
export function frameAt(seconds: number): Frame {
  // Modulo of a negative number is negative in JavaScript, and a negative
  // elapsed time is not hypothetical here: a requestAnimationFrame timestamp
  // is the moment the frame began, which can be *earlier* than a
  // performance.now() taken while that same frame was already in progress.
  // Unguarded, that walked the candle index to -1 and threw on the first
  // frame, killing the loop before it drew anything.
  const t = ((seconds % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS;

  if (t > REVEAL_SECONDS + HOLD_SECONDS) {
    const k = (t - REVEAL_SECONDS - HOLD_SECONDS) / RESET_SECONDS;
    return {
      ...FINAL_FRAME,
      // Ease out rather than linear: a linear fade on a dark scene reads as a
      // flicker at the very end.
      opacity: 1 - k * k,
    };
  }

  if (t > REVEAL_SECONDS) return FINAL_FRAME;

  const raw = Math.max(indexAt(t), 0);
  const count = Math.min(Math.max(Math.floor(raw) + 1, 1), COUNT);
  const partial = Math.min(Math.max(raw - Math.floor(raw), 0), 1);
  const last = CANDLES[count - 1];
  const settled = CANDLES[count - 2] ?? last;

  return {
    count,
    partial,
    phase: phaseFor(count - 1),
    // The forming candle's close travels from the previous close to its own,
    // so the axis tag moves continuously instead of stepping.
    price: settled.close + (last.close - settled.close) * partial,
    opacity: 1,
    broken: count - 1 >= BREAK_INDEX,
    reachedTarget: count - 1 >= TARGET_INDEX,
    complete: count >= COUNT,
  };
}

export const FINAL_FRAME: Frame = {
  count: COUNT,
  partial: 1,
  phase: "settle",
  price: CANDLES[COUNT - 1].close,
  opacity: 1,
  broken: true,
  reachedTarget: true,
  complete: true,
};

export const CANDLE_COUNT = COUNT;

/** Price extremes across the whole series, so the scale never rescales mid-cycle. */
export const RANGE = (() => {
  const lows = CANDLES.map((c) => c.low);
  const highs = CANDLES.map((c) => c.high);
  const lo = Math.min(...lows, KEY_LEVEL, STOP);
  const hi = Math.max(...highs, KEY_LEVEL);
  const pad = (hi - lo) * 0.14;
  return { min: lo - pad, max: hi + pad };
})();
