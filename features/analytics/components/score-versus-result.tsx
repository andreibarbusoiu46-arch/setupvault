import { Card } from "@/components/ui/card";
import { formatWinRate } from "@/features/analytics/utils/compute";
import type { ScoreBand } from "@/features/analytics/utils/score-analytics";

/**
 * Win rate observed within each score band.
 *
 * Wording is deliberate: "observed in your logged setups". A quality score and
 * an outcome can move together for many reasons, and three bands of a few dozen
 * trades is nowhere near evidence of a cause.
 */
export function ScoreVersusResult({ bands }: { bands: ScoreBand[] }) {
  const anyMeaningful = bands.some((band) => band.meaningful);

  return (
    <Card glass className="p-5">
      <h3 className="text-sm font-medium text-fg">Score against outcome</h3>
      <p className="mt-0.5 text-xs text-fg-muted">
        Observed in your logged setups. Not a prediction.
      </p>

      {!anyMeaningful ? (
        <p className="py-6 text-sm text-fg-subtle">
          Not enough setups in any band yet to be worth comparing.
        </p>
      ) : (
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {bands.map((band) => (
            <div key={band.key} className="rounded-xl border border-border p-4">
              <dt className="eyebrow">Score {band.label}</dt>
              <dd className="stat mt-2 text-xl text-fg">
                {band.meaningful ? formatWinRate(band.stats.winRate) : "—"}
              </dd>
              <dd className="mt-1 text-xs text-fg-subtle">
                {band.stats.total} {band.stats.total === 1 ? "setup" : "setups"}
                {band.meaningful
                  ? ` · ${band.stats.resolved} resolved`
                  : " · too few to compare"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
