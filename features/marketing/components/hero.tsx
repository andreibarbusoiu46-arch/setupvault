import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { HeroChart } from "@/features/marketing/components/hero-chart";
import { EquityCurve } from "@/features/marketing/components/equity-curve";
import { Reveal } from "@/features/marketing/components/reveal";

/**
 * The hero.
 *
 * The price ladder that used to run down the left — a vertical scale with a
 * filled tag at the live price — is gone. It was a nice idea and it read as
 * clutter: three floating numbers beside a headline look like stray labels
 * rather than a scale, and on a phone they crowded the one column of type
 * the hero has. The levels still live on the chart that owns them.
 *
 * Three planes, in depth, rather than a row of things side by side: the
 * perspective floor at the bottom of the stack, the tilted terminal behind
 * the type, and the equity curve in front of both. A desk seen at an angle,
 * with the one number that matters floating nearest the reader.
 *
 * The curve takes the front plane because it is what a trader opens first.
 * The terminal is ambience — it is what the screen looks like — and it sits
 * at reduced opacity behind the headline, because the sentence has to land
 * before any chart means anything.
 *
 * The vertical candlestick panel that used to run under the copy on a phone
 * is gone from here. Two charts stacked in a mobile hero is a scroll, not a
 * hero, and those same candles open step one of "How it works" immediately
 * below — so nothing is lost but the duplication.
 */


export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-28 sm:pb-24 sm:pt-36 lg:pt-40">
      <HeroChart />

      <div className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] lg:gap-x-14">
          <div>
            <div>
              <Reveal>
                <h1 className="display text-balance text-[2.05rem] text-fg min-[400px]:text-[2.6rem] sm:text-[3.6rem] lg:text-[4.1rem]">
                  Stop guessing.
                  <br />
                  Start building your edge.
                </h1>
              </Reveal>

              <Reveal delay={0.08}>
                <p className="mt-6 max-w-xl text-[16.5px] leading-[1.6] text-fg-muted sm:mt-7 sm:text-[18px]">
                  Every setup you take, with the chart you were looking at, the
                  thesis you wrote and what actually happened. Searchable months
                  later, when the same pattern shows up again.
                </p>
              </Reveal>

              <Reveal delay={0.14}>
                <div className="mt-9 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
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

          {/* The front plane. On a phone it follows the copy; from `lg` it sits
              beside it, where the terminal behind has receded far enough for a
              solid panel to read on top of it. */}
          <Reveal delay={0.26} className="w-full">
            <EquityCurve className="w-full shadow-floating" />
            <p className="mt-3 text-center text-[12px] leading-relaxed text-fg-subtle lg:text-left">
              An illustrative playbook over sixty logged setups. Your own curve
              is whatever your results make it.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
