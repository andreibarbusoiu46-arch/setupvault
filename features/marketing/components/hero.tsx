import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import {
  ENTRY,
  HeroChart,
  HeroChartMobile,
  LIVE,
  TARGET,
} from "@/features/marketing/components/hero-chart";
import { Reveal } from "@/features/marketing/components/reveal";

/**
 * The hero.
 *
 * Built around a price ladder rather than a centred stack with a pill badge
 * over it. Every trading platform draws a vertical price scale with a filled
 * tag at the live price; this is that scale, used as the page's spine. Its
 * three values are the entry, live price and target of the setup in the chart
 * below — imported from the chart itself, so the two can never drift apart.
 *
 * That also removes three things that read as template chrome: the "now in
 * Early Access" pill, the row of facts strung together with middle dots, and
 * the centred composition every SaaS hero uses.
 */

const LEVELS = [
  { value: TARGET, live: false },
  { value: LIVE, live: true },
  { value: ENTRY, live: false },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-24 pt-28 sm:pb-28 sm:pt-44">
      <HeroChart />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="ladder max-w-3xl">
          {/* The scale. Its readings match the chart exactly. */}
          <div className="ladder-scale" aria-hidden="true">
            {LEVELS.map((level) => (
              <p
                key={level.value}
                className={level.live ? "ladder-tick ladder-tick--live" : "ladder-tick"}
              >
                {level.value}
              </p>
            ))}
          </div>

          <div>
            <Reveal>
              <h1 className="display text-balance text-[2.05rem] text-fg min-[400px]:text-[2.6rem] sm:text-[4.25rem] lg:text-[5rem]">
                Stop guessing.
                <br />
                Start building your edge.
              </h1>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="mt-6 max-w-xl text-[16.5px] leading-[1.6] text-fg-muted sm:mt-8 sm:text-[19px]">
                Every setup you take, with the chart you were looking at, the
                thesis you wrote and what actually happened. Searchable months
                later, when the same pattern shows up again.
              </p>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mt-9 flex w-full flex-col gap-3 sm:mt-11 sm:w-auto sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-12 px-7 text-[15px]">
                  <Link href={ROUTES.signup}>Start free</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-7 text-[15px]"
                >
                  <Link href="#how">See how it works</Link>
                </Button>
              </div>
            </Reveal>

            {/* Prose, not a row of facts joined by middle dots. */}
            <Reveal delay={0.2}>
              <p className="mt-7 max-w-md text-[13.5px] leading-relaxed text-fg-subtle">
                Private by construction. Nothing connects to your broker. Free
                while we build it.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Below `lg` the wide terminal has nowhere to sit beside the copy, so
            the vertical panel runs in the flow instead of behind the text. The
            bottom padding is for the glass badge that overhangs it. */}
        <Reveal delay={0.3} className="w-full pb-4 sm:pb-24 lg:hidden">
          <HeroChartMobile className="mx-auto mt-12 w-full max-w-[440px] sm:max-w-[540px]" />
        </Reveal>
      </div>
    </section>
  );
}
