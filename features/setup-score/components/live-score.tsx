"use client";

import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/features/setup-score/components/score-ring";
import type { SetupScore } from "@/features/setup-score/types";

/**
 * The score as it stands while the form is being filled in. Shows the two
 * cheapest remaining wins rather than the full list — the detail page is where
 * the whole breakdown belongs.
 */
export function LiveScore({ result }: { result: SetupScore }) {
  return (
    <Card glass className="flex items-center gap-5 p-5">
      {result.scorable ? (
        <ScoreRing score={result.score} grade={result.grade} size={96} />
      ) : (
        <div className="flex size-24 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-xs text-fg-subtle">
          No score
        </div>
      )}

      <div className="min-w-0">
        <h3 className="text-sm font-medium text-fg">Setup quality score</h3>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          {result.scorable
            ? "Updates as you fill the form. It measures how completely you recorded the setup, not whether it will work."
            : "Add an entry, stop or target and the score appears."}
        </p>

        {result.scorable && result.improvements.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5">
            {result.improvements.slice(0, 2).map((item) => (
              <li key={item} className="flex gap-2 text-xs text-fg-subtle">
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-fg-subtle"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
