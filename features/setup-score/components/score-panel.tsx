import { Check, Info, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { MAX_SCORE } from "@/features/setup-score/constants";
import { ScoreRing } from "@/features/setup-score/components/score-ring";
import type { SetupScore } from "@/features/setup-score/types";

/** Full breakdown, for the setup detail page. */
export function ScorePanel({ result }: { result: SetupScore }) {
  if (!result.scorable) {
    return (
      <Card glass className="p-5">
        <h3 className="text-sm font-medium text-fg">Setup quality score</h3>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Score unavailable — this setup has no entry, stop or target recorded.
          Add the levels and the score appears.
        </p>
      </Card>
    );
  }

  return (
    <Card glass className="overflow-hidden p-0">
      <div className="flex items-center gap-5 border-b border-glass backdrop-blur-xl-border p-5">
        <ScoreRing score={result.score} grade={result.grade} />

        <div className="min-w-0">
          <h3 className="text-sm font-medium text-fg">Setup quality score</h3>
          <p className="mt-1 text-sm text-fg-muted">{result.summary}</p>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-fg-subtle">
            <Info className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
            A measure of how completely and coherently you recorded this setup.
            Not a prediction, and not related to whether it made money.
          </p>
        </div>
      </div>

      {result.hasGeometryError ? (
        <p className="flex items-start gap-2 border-b border-glass backdrop-blur-xl-border bg-negative-soft px-5 py-3 text-xs leading-relaxed text-fg">
          <TriangleAlert
            className="mt-0.5 size-3.5 shrink-0 text-negative"
            aria-hidden="true"
          />
          One of the levels sits on the wrong side of the entry for this
          direction, so part of the score could not be awarded.
        </p>
      ) : null}

      <dl className="divide-y divide-border">
        {result.breakdown.map((item) => (
          <div key={item.component} className="flex items-center gap-4 px-5 py-3">
            <dt className="min-w-0 flex-1 text-sm text-fg-muted">{item.label}</dt>
            <dd className="flex items-center gap-3">
              <span className="h-1 w-20 overflow-hidden rounded-full bg-surface-hover sm:w-28">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(item.points / item.max) * 100}%` }}
                />
              </span>
              <span className="numeric w-12 text-right text-sm text-fg">
                {item.points}/{item.max}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-5 border-t border-border p-5 sm:grid-cols-2">
        <div>
          <p className="eyebrow">What is there</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {result.strengths.length === 0 ? (
              <li className="text-sm text-fg-subtle">Nothing yet.</li>
            ) : (
              result.strengths.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-fg-muted">
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-positive"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <p className="eyebrow">What would raise it</p>
          <ul className="mt-2.5 flex flex-col gap-2">
            {result.improvements.length === 0 ? (
              <li className="text-sm text-fg-subtle">
                Nothing — this setup is fully recorded.
              </li>
            ) : (
              result.improvements.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-fg-muted">
                  <span
                    className="mt-1.5 size-1 shrink-0 rounded-full bg-fg-subtle"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className="border-t border-border px-5 py-3 text-xs text-fg-subtle">
        Scored out of {MAX_SCORE} from the fields you logged. SetupVault has no
        market data, so it does not judge where your levels sat on the chart.
      </p>
    </Card>
  );
}
