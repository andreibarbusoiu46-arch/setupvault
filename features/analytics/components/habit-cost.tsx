import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TagCost } from "@/features/analytics/utils/compute";

/**
 * What your own habits cost you.
 *
 * The form is a diverging bar because the data's job is polarity: the
 * question is not "how big is this tag" but "which side of zero is it on".
 * Everything sits against one centre line, so costly and profitable habits
 * are read in a single downward sweep.
 *
 * On colour: the validator puts this product's green and red at ΔE 2.6 for
 * deuteranopia — for roughly one man in sixteen they are the same colour. So
 * the meaning never rests on the hue. The bar's side of the centre line
 * carries it, and every row is labelled with a signed figure. Colour only
 * agrees with what the shape and the number already said.
 */
export function HabitCost({ tags }: { tags: TagCost[] }) {
  if (tags.length === 0) {
    return (
      <Card glass className="p-6 backdrop-blur-xl sm:p-7">
        <h2 className="text-[15px] font-medium tracking-tight text-fg">
          What your habits cost
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-fg-muted">
          Tag the moment you broke your own rule — <em>entered early</em>,{" "}
          <em>moved the stop</em>, <em>revenge</em> — and once a tag appears on
          three setups it shows up here, priced in R.
        </p>
      </Card>
    );
  }

  // One scale for every bar, so the lengths are comparable down the column.
  const extent = Math.max(...tags.map((tag) => Math.abs(tag.netR)), 1);
  const costly = tags.filter((tag) => tag.netR < 0);
  const worst = costly[0];

  return (
    <Card glass className="p-6 backdrop-blur-xl sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[15px] font-medium tracking-tight text-fg">
          What your habits cost
        </h2>
        <p className="text-xs text-fg-subtle">
          Tags on three or more setups
        </p>
      </div>

      {worst ? (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
          Your most expensive habit is{" "}
          <span className="font-medium text-fg">{worst.label}</span> — it
          appears on <span className="numeric">{worst.total}</span> setups and
          has cost you{" "}
          <span className="numeric font-medium text-negative">
            {formatR(worst.netR)}
          </span>
          .
        </p>
      ) : (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
          Nothing you tag is losing you money yet.
        </p>
      )}

      <ul className="mt-6 flex flex-col gap-3.5">
        {tags.map((tag) => {
          const negative = tag.netR < 0;
          const share = Math.abs(tag.netR) / extent;

          return (
            <li key={tag.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[13.5px] text-fg">
                  {tag.label}
                </p>
                <p
                  className={cn(
                    "numeric shrink-0 text-[13.5px] font-medium",
                    tag.netR === 0
                      ? "text-fg-subtle"
                      : negative
                        ? "text-negative"
                        : "text-positive",
                  )}
                >
                  {formatR(tag.netR)}
                </p>
              </div>

              {/* The centre line is the zero. Everything left of it was paid
                  out, everything right of it came back. */}
              <div className="relative mt-2 h-1.5">
                <div className="absolute inset-0 flex">
                  <div className="h-full flex-1 rounded-l-full bg-black/[0.05] dark:bg-white/[0.05]" />
                  <div className="h-full flex-1 rounded-r-full bg-black/[0.05] dark:bg-white/[0.05]" />
                </div>

                <div
                  aria-hidden="true"
                  className="absolute inset-y-[-3px] left-1/2 w-px -translate-x-1/2 bg-border-strong"
                />

                <div
                  className={cn(
                    "absolute inset-y-0",
                    negative
                      ? "rounded-l-full bg-negative"
                      : "rounded-r-full bg-positive",
                  )}
                  style={
                    negative
                      ? {
                          right: "50%",
                          width: `${share * 50}%`,
                        }
                      : { left: "50%", width: `${share * 50}%` }
                  }
                />
              </div>

              <p className="mt-1.5 text-[11.5px] text-fg-subtle">
                <span className="numeric">{tag.total}</span> setups
                {tag.winRate === null ? null : (
                  <>
                    {" · "}
                    <span className="numeric">{tag.winRate}%</span> win rate
                  </>
                )}
                {tag.scored < tag.total ? (
                  <>
                    {" · "}
                    <span className="numeric">{tag.total - tag.scored}</span> not
                    scored
                  </>
                ) : null}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 border-t border-border pt-4 text-[11.5px] leading-relaxed text-fg-subtle">
        R is read off your plan: a win counts the ratio you set, a loss counts
        exactly −1R, break-even counts zero. Setups still open, or saved without
        a ratio, are left out rather than counted as nothing. If you closed
        early or moved a stop, your broker&rsquo;s number will differ — and that
        gap is worth knowing too.
      </p>
    </Card>
  );
}

/** Always signed, so the direction survives being read on its own. */
function formatR(value: number) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return "0.0R";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded).toFixed(1)}R`;
}
