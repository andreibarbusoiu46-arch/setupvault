import Link from "next/link";
import { Check, Loader } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { Section } from "@/features/marketing/components/section";
import { cn } from "@/lib/utils";

/**
 * What stands where a testimonials section usually goes.
 *
 * This product has no users yet, so it has no quotes. Inventing them is the
 * one thing a tool about keeping an honest record of your own trading cannot
 * do — and traders are the audience least likely to believe three glowing
 * quotes on a site that launched last week.
 *
 * So the slot says what is actually true: here is what works today, here is
 * what is being built, and you can be early. That is the only claim available,
 * and for this audience it is a stronger one.
 */

const STATE = [
  { label: "The library: setups, screenshots, notes, levels", done: true },
  { label: "Strategies and tags, in your own vocabulary", done: true },
  { label: "Search and filters across your whole history", done: true },
  { label: "Analytics and the trading calendar", done: true },
  { label: "Setup score — explainable, and separate from the outcome", done: true },
  { label: "AI reviews of how a setup was put together", done: true },
  { label: "Paid plans and billing", done: false },
];

export function BuildingInPublic() {
  return (
    <Section id="progress" className="border-t border-border">
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 className="display text-[1.95rem] text-fg sm:text-[2.6rem]">
            No testimonials. We only started.
          </h2>

          <p className="mt-5 max-w-lg text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
            Every new tool puts three enthusiastic quotes here. We could write
            three too, and you would have no way of knowing. A product whose
            whole argument is that you should keep an honest record of your own
            trading does not get to open with invented praise.
          </p>

          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
            So here is the real state of it instead. If something you need is
            missing, now is the point where saying so actually changes what gets
            built next.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href={ROUTES.signup}>Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#faq">Read the questions first</Link>
            </Button>
          </div>
        </div>

        {/* The state of the build, as a list with two states rather than a
            progress bar: a percentage here would be a number we made up. */}
        <ul className="flex flex-col">
          {STATE.map((item) => (
            <li
              key={item.label}
              className="flex items-start gap-3 border-b border-border py-4 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-px flex size-5 shrink-0 items-center justify-center rounded-full",
                  item.done
                    ? "bg-positive-soft text-positive"
                    : "bg-accent-soft text-accent",
                )}
              >
                {item.done ? (
                  <Check className="size-3" strokeWidth={2.6} />
                ) : (
                  <Loader className="size-3" strokeWidth={2.2} />
                )}
              </span>

              <span className="min-w-0 flex-1 text-[14px] leading-snug text-fg-muted">
                {item.label}
              </span>

              <span
                className={cn(
                  "shrink-0 text-[12px] tracking-tight",
                  item.done ? "text-fg-subtle" : "text-accent",
                )}
              >
                {item.done ? "live" : "building"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
