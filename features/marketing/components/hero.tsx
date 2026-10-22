"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { HeroStage } from "@/features/marketing/components/hero-stage";
import { NotificationStack } from "@/features/marketing/components/notification-stack";
import type { SceneEvent } from "@/features/marketing/components/trading-scene";
import { AmbientBackdropMount } from "@/features/marketing/components/ambient-backdrop-mount";
import { Reveal } from "@/features/marketing/components/reveal";

/**
 * The hero, as a cinematic frame rather than a column.
 *
 * Every colour here is a token, not a literal. An earlier version pinned the
 * section to `bg-black` with `text-white` on it, which looked right in dark
 * mode and was unreadable in light: the WebGL backdrop sits at `-z-10`, which
 * paints above the section's own background rather than behind it, so in
 * light mode it repainted the frame near-white under white type. Tokens flip
 * with the `dark` class, so the same markup is obsidian in one theme and
 * clean paper in the other, and neither is a special case.
 *
 * The old arrangement was type on the left, a card on the right — a two-up
 * that puts the headline and the product in competition for the same
 * horizontal band, and reads as a template because it is one.
 *
 * This one is stacked in depth instead. The 3D stage fills the upper frame
 * and runs full-bleed to both edges, so it reads as a window into the product
 * rather than a picture of it. Underneath, a gradient takes it down to pitch
 * black, and the headline sits on that black with nothing behind it to fight.
 * The scene does not stop at the fade — it continues under the type, which is
 * what makes the frame feel deep rather than layered.
 *
 * The copy is deliberately short here. A headline competing with a moving 3D
 * scene two inches above it loses, so the paragraph says one thing and the
 * CTA is a single compact pill rather than the pair of full-width slabs that
 * used to sit here.
 */
export function Hero() {
  // The only state the hero keeps. The chart emits three milestones per
  // cycle and one reset; everything between them is written to the DOM by
  // the scene's own loop, so a running animation costs no renders here.
  const [shown, setShown] = useState<SceneEvent[]>([]);

  const onEvent = useCallback((event: SceneEvent) => {
    setShown((current) =>
      event === "reset"
        ? []
        : current.includes(event)
          ? current
          : [...current, event],
    );
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-canvas">
      {/* The stage. Full-bleed and taller than the area it visibly occupies,
          because the bottom of it is meant to be eaten by the fade. */}
      {/* The stage sets its own height from the scene's aspect ratio rather
          than taking a percentage of the hero.

          A percentage was tried and broke on a phone: the plane is a 1000x430
          viewBox drawn with preserveAspectRatio="none", so a tall container
          stretched the curve vertically until it climbed straight through the
          headline. Pinning the aspect keeps the composition identical at
          every width; only its scale changes. It is deliberately wider than
          the viewport — a scene that ends at the edge reads as a picture of a
          product, one that runs past it reads as a window into one. */}
      {/* Below `lg` the stage is pushed clear of the fixed navbar. The plane
          is rotated, so a card's painted top sits higher than its layout box
          suggests — at 390 and at 834 the leading card measured 46px and 58px
          from the top against a 64px bar, i.e. underneath it. */}
      <div className="pointer-events-none absolute inset-x-0 top-20 lg:top-0">
        <div className="relative mx-auto aspect-[1000/430] w-[150%] max-w-none -translate-x-[32%] sm:w-[128%] sm:-translate-x-[28%] lg:w-[108%] lg:-translate-x-[8%]">
          <AmbientBackdropMount className="absolute inset-0" />
          <HeroStage
            className="absolute inset-0"
            onEvent={onEvent}
            broken={shown.includes("break")}
          />

          {/* Cinematic falloff. Two gradients, not one: a vertical ramp that
              takes the scene down to the page colour so the type has
              something flat to sit on, and a radial vignette that pulls the
              corners in so the eye lands centre-frame.

              Both fade to `--canvas`, not to black — in light mode a fade to
              black would put a dark smear under a light headline. */}
          <div
            className="absolute inset-x-0 bottom-0 h-[58%]"
            style={{
              background:
                "linear-gradient(to top, var(--canvas) 16%, color-mix(in srgb, var(--canvas) 88%, transparent) 44%, color-mix(in srgb, var(--canvas) 38%, transparent) 72%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(128% 94% at 50% 22%, transparent 34%, color-mix(in srgb, var(--canvas) 58%, transparent) 76%, var(--canvas) 100%)",
            }}
          />
        </div>
      </div>

      {/* The copy, on the black. The top padding is what positions it under
          the scene; it is large because the scene above it is the point. */}
      <div className="relative mx-auto w-full max-w-5xl px-5 pb-20 pt-[clamp(17rem,40vw,33rem)] sm:px-8 sm:pb-24">
        <div className="max-w-2xl">
          <Reveal>
            <h1 className="display text-balance text-[2.15rem] text-fg min-[400px]:text-[2.7rem] sm:text-[3.9rem] lg:text-[4.4rem]">
              Stop guessing.
              <br />
              Start building your edge.
            </h1>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-5 max-w-lg text-[16px] leading-[1.6] text-fg-muted sm:mt-6 sm:text-[17.5px]">
              Every setup you take — the chart, the thesis, the outcome — kept
              in one place and searchable months later, when the same pattern
              shows up again.
            </p>
          </Reveal>

          <Reveal delay={0.14}>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 sm:mt-9">
              <Button
                asChild
                size="lg"
                className={[
                  "sv-sheen relative h-11 overflow-hidden rounded-full px-6 text-[14.5px] font-semibold",
                  "bg-gradient-to-r from-[#4f46e5] to-[#7c3aed] text-white",
                  "shadow-[0_1px_0_0_rgb(255_255_255/0.22)_inset,0_10px_30px_-10px_rgb(99_102_241/0.9)]",
                  "hover:brightness-110",
                ].join(" ")}
              >
                {/* "Start free", not "Start free trial": the free tier does
                    not expire, and there is no paid plan open to trial into
                    yet. */}
                <Link href={ROUTES.signup}>Start free →</Link>
              </Button>

              <Link
                href="#how"
                className="text-[14.5px] text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                Explore the product
              </Link>
            </div>
          </Reveal>


          <Reveal delay={0.24}>
            <p className="mt-8 max-w-md text-[12.5px] leading-relaxed text-fg-subtle">
              Illustrative setups and an illustrative playbook. Private by
              construction — nothing connects to your broker. Free while we
              build it.
            </p>
          </Reveal>
        </div>

        {/* The notices the session raises. Beside the copy where there is
            width for them, under it where there is not — never over the
            headline or the CTA. */}
        <NotificationStack
          shown={shown}
          className="mt-10 w-full max-w-[20rem] lg:absolute lg:right-0 lg:top-1/2 lg:mt-0 lg:w-[20rem] lg:-translate-y-1/2"
        />
      </div>
    </section>
  );
}
