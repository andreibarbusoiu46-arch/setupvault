/**
 * One playbook's results, as a sequence of R multiples.
 *
 * The page was quoting a 68.4% win rate in one component and +0.74R
 * expectancy in another, both as string literals, with no sequence behind
 * either — so nothing stopped them drifting apart, and there was no way to
 * draw an equity curve that agreed with them. This array is the source now:
 * the curve is its running total, and the win rate and expectancy are
 * computed from it below. Change a trade and every figure on the page moves
 * together.
 *
 * It is illustrative, and the hero says so. What it is not is arbitrary: the
 * shape is what a real edge looks like rather than what a marketing team
 * would draw. Losses cluster — indexes 30 to 35 are five losers and a
 * breakeven in six trades, a four-R drawdown in a week that would have most
 * people abandoning the playbook. The curve is not a diagonal line, because
 * real ones never are.
 *
 * A loss is -1R by definition: one unit of planned risk. That is what makes
 * R the unit worth counting in — it is account-size agnostic, so the curve
 * means the same thing whether the account is 2,000 or 200,000.
 */

export const PLAYBOOK_NAME = "London breakout";

/** 60 consecutive trades, in order. -1 is a stop, 0 is a scratch. */
export const R_SEQUENCE: readonly number[] = [
  1.6, -1, 2.0, 1.2, -1, 2.5, 1.4, -1, 1.1, 1.8,
  -1, 1.2, 3.4, 1.0, -1, 1.7, 2.1, -1, 1.1, 1.5,
  1.7, -1, 1.1, 2.6, 1.3, -1, 1.0, 2.2, 1.2, -1,
  -1, -1, 0, -1, 1.1, -1, 1.3, 1.7, 1.0, 1.5,
  -1, 1.9, 1.2, 1.0, -1, 2.4, 1.4, 1.1, -1, 2.0,
  1.1, 1.6, -1, 1.0, 2.2, 1.3, -1, 1.0, 1.8, 1.4,
];

/** The running total — what the equity curve actually plots. */
export const EQUITY: readonly { trade: number; r: number; delta: number }[] =
  R_SEQUENCE.reduce<{ trade: number; r: number; delta: number }[]>(
    (rows, delta, index) => {
      const previous = index === 0 ? 0 : rows[index - 1].r;
      rows.push({
        trade: index + 1,
        r: Number((previous + delta).toFixed(2)),
        delta,
      });
      return rows;
    },
    [],
  );

export const TRADE_COUNT = R_SEQUENCE.length;
export const WIN_COUNT = R_SEQUENCE.filter((r) => r > 0).length;
export const LOSS_COUNT = R_SEQUENCE.filter((r) => r < 0).length;

const TOTAL_R = R_SEQUENCE.reduce((sum, r) => sum + r, 0);

/** e.g. 68.3 */
export const WIN_RATE = Number(((WIN_COUNT / TRADE_COUNT) * 100).toFixed(1));
/** e.g. "+0.76R" — the average outcome per trade, which is the number that matters. */
export const EXPECTANCY = TOTAL_R / TRADE_COUNT;
export const EXPECTANCY_LABEL = `${EXPECTANCY >= 0 ? "+" : ""}${EXPECTANCY.toFixed(2)}R`;
export const NET_R_LABEL = `${TOTAL_R >= 0 ? "+" : ""}${TOTAL_R.toFixed(1)}R`;

/**
 * The deepest peak-to-trough stretch, in R.
 *
 * Worth showing next to the total rather than hiding: a curve without its
 * drawdown is the half of the story that sells, and a trader reads the
 * missing half as a reason not to trust the rest.
 */
export const MAX_DRAWDOWN = EQUITY.reduce(
  (worst, point, index) => {
    const peak = Math.max(...EQUITY.slice(0, index + 1).map((p) => p.r), 0);
    return Math.min(worst, point.r - peak);
  },
  0,
);
export const MAX_DRAWDOWN_LABEL = `${MAX_DRAWDOWN.toFixed(1)}R`;
