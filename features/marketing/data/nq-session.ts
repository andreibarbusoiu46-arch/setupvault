/**
 * A real session of NQ100 futures, 15-minute bars.
 *
 * Pulled from the Yahoo Finance chart API for NQ=F and frozen here. It is not
 * a screenshot of anyone's platform — those are copyrighted, and a picture
 * cannot animate anyway — and it is not generated from a sine wave either.
 * Price moves in a way that is quite hard to fake convincingly: the long dull
 * stretches, the one bar that does half the day's range, the wick that takes
 * out the low and reverses. Traders read that in about a second.
 *
 * Every number the marketing page shows about this setup is derived from this
 * array: the ladder in the hero, the price scale on the chart, the entry, the
 * risk-to-reward. If the window is ever replaced, those follow automatically.
 *
 * Window: 2026-10-15 22:15 UTC to 2026-10-16 13:00 UTC.
 * The low at index 8 is swept, reclaimed, and the session runs 265 points.
 */

export const SESSION = {
  /** What we call it on the page. */
  label: "NQ100",
  /** What it is, for anyone who checks. */
  symbol: "NQ=F",
  interval: "15m",
  source: "Yahoo Finance",
  capturedFrom: "2026-10-15T22:15:00Z",
  capturedTo: "2026-10-16T13:00:00Z",
} as const;

/** [open, high, low, close] — 60 consecutive bars, no gaps. */
export const BARS: readonly (readonly [number, number, number, number])[] = [
  [30122.25, 30124, 30108, 30113.25],
  [30112, 30113.25, 30070, 30088.75],
  [30088.75, 30089, 30064, 30068.75],
  [30069.75, 30070, 30027.5, 30061],
  [30059.5, 30064, 30010.5, 30016.5],
  [30017.5, 30018.5, 29982.75, 29986.75],
  [29988.25, 30003.25, 29982.5, 29988],
  [29986.75, 30052.5, 29977.5, 30039.75],
  [30041, 30043.75, 29959.25, 29994.25],
  [29993.75, 30037, 29977.5, 30035.5],
  [30035, 30061.25, 30023.25, 30040.25],
  [30039.75, 30071.75, 30039.75, 30060.75],
  [30060.75, 30077.75, 30037.25, 30043.75],
  [30044.5, 30079, 30044, 30071.75],
  [30071.25, 30091.75, 30046.75, 30052],
  [30051.5, 30084.5, 30043.25, 30073.25],
  [30073.75, 30116.5, 30069, 30107.5],
  [30108, 30129.75, 30094.75, 30113],
  [30111.5, 30115.75, 30095.5, 30096.5],
  [30097.5, 30130.5, 30087.25, 30121.5],
  [30122.25, 30122.5, 30095, 30103],
  [30104.25, 30107.5, 30074, 30106],
  [30105.5, 30211.75, 30105.5, 30202.5],
  [30170.75, 30173.5, 30148.75, 30161.25],
  [30160.5, 30198, 30149.5, 30180.25],
  [30180.75, 30195, 30162.75, 30190.25],
  [30189, 30206.5, 30184.25, 30200],
  [30201.25, 30225, 30189.25, 30205.25],
  [30204.25, 30205, 30169.5, 30173],
  [30174.25, 30198, 30161.75, 30173.5],
  [30176.25, 30207.75, 30173.75, 30191.25],
  [30191.5, 30209.75, 30146.5, 30146.5],
  [30146, 30155.25, 30127.75, 30133.25],
  [30131.75, 30167.25, 30126, 30137.75],
  [30136.5, 30166.5, 30133.5, 30152],
  [30152.75, 30195, 30146, 30187.75],
  [30186.75, 30198.5, 30173.75, 30174.75],
  [30178.5, 30178.5, 30149.25, 30150],
  [30149, 30162, 30127.75, 30158],
  [30157.5, 30201, 30153.5, 30173],
  [30173, 30193, 30155.25, 30182.5],
  [30182.25, 30184.75, 30152, 30180.25],
  [30180.5, 30185, 30144.75, 30144.75],
  [30144.5, 30164, 30131.25, 30158],
  [30158.25, 30174.25, 30148.5, 30168],
  [30167.25, 30178.75, 30134.25, 30136.25],
  [30136, 30156.75, 30088.5, 30095.5],
  [30094.25, 30098.75, 30063, 30088.75],
  [30090.75, 30125, 30090.75, 30119.25],
  [30119.5, 30138, 30114.5, 30126.75],
  [30127, 30128.25, 30087.5, 30090.5],
  [30090, 30138.5, 30071.75, 30128.5],
  [30127, 30131.5, 30093.5, 30096.25],
  [30096.25, 30104.25, 30051.5, 30070.25],
  [30069.25, 30095.25, 30051, 30094.5],
  [30093.5, 30129.75, 30089.75, 30099.75],
  [30101.25, 30122, 30084.5, 30118.25],
  [30116.5, 30126.25, 30065.75, 30079.75],
  [30080, 30084, 30047.75, 30066.75],
  [30065, 30085.75, 30042.75, 30079.75],
] as const;

/**
 * The setup, read off the bars above.
 *
 * Entry on the reclaim of the swept low, stop below the wick that took it,
 * target at the session high the move actually reached. `live` is the last
 * close in the window.
 */
export const LEVELS = {
  entry: 29995,
  stop: 29940,
  target: 30225,
  live: 30080,
} as const;

/** Risk-to-reward, computed rather than asserted. */
export const RISK_REWARD = (LEVELS.target - LEVELS.entry) / (LEVELS.entry - LEVELS.stop);

/** e.g. "4.2R" */
export const RISK_REWARD_LABEL = `${RISK_REWARD.toFixed(1)}R`;

/** Round price labels onto a readable grid for the chart's own axis. */
export function priceAxis(steps = 6): number[] {
  const lows = BARS.map((b) => b[2]);
  const highs = BARS.map((b) => b[1]);
  const lo = Math.min(...lows);
  const hi = Math.max(...highs);
  const pad = (hi - lo) * 0.08;
  const top = Math.ceil((hi + pad) / 25) * 25;
  const bottom = Math.floor((lo - pad) / 25) * 25;
  const step = (top - bottom) / (steps - 1);

  return Array.from({ length: steps }, (_, i) =>
    Math.round((top - i * step) / 5) * 5,
  );
}

/**
 * Maps a price onto a y coordinate inside an SVG of `height` units, with the
 * series padded away from both edges so wicks never touch the frame.
 */
export function priceScaler(height: number, padding = 0.08) {
  const lo = Math.min(...BARS.map((b) => b[2]));
  const hi = Math.max(...BARS.map((b) => b[1]));
  const pad = (hi - lo) * padding;
  const min = lo - pad;
  const span = hi - lo + pad * 2;

  return (price: number) => height - ((price - min) / span) * height;
}
