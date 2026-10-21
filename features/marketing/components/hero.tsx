import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import {
  HeroStage,
  HeroStageCards,
} from "@/features/marketing/components/hero-stage";
import { AmbientBackdropMount } from "@/features/marketing/components/ambient-backdrop-mount";
import { Reveal } from "@/features/marketing/components/reveal";

/**
 * The hero, as a cinematic frame rather than a column.
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
  return (
    <section className="relative isolate overflow-hidden bg-black">
      {/* The stage. Full-bleed and taller than the area it visibly occupies,
          because the bottom of it is meant to be eaten by the fade. */}
      <AmbientBackdropMount className="absolute inset-0 -z-10" />

      {/* The stage sets its own height from the scene's aspect ratio rather
          than taking a percentage of the hero.

          A percentage was tried and broke on a phone: the plane is a 1000x430
          viewBox drawn with preserveAspectRatio="none", so a tall container
          stretched the curve vertically until it climbed straight through the
          headline. Pinning the aspect keeps the composition identical at
          every width; only its scale changes. It is deliberately wider than
          the viewport — a scene that ends at the edge reads as a picture of a
          product, one that runs past it reads as a window into one. */}
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <div className="relative mx-auto aspect-[1000/430] w-[200%] max-w-none -translate-x-[25%] sm:w-[128%] sm:-translate-x-[11%] lg:w-[108%] lg:-translate-x-[4%]">
          <HeroStage className="absolute inset-0" />

          {/* Cinematic falloff. Two gradients, not one: a vertical ramp that
              takes the scene into black for the type, and a radial vignette
              that pulls the corners down so the eye lands centre-frame. */}
          <div
            className="absolute inset-x-0 bottom-0 h-[58%]"
            style={{
              background:
                "linear-gradient(to top, #000 16%, rgb(0 0 0 / 0.88) 44%, rgb(0 0 0 / 0.38) 72%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(128% 94% at 50% 22%, transparent 34%, rgb(0 0 0 / 0.58) 76%, #000 100%)",
            }}
          />
        </div>
      </div>

      {/* The copy, on the black. The top padding is what positions it under
          the scene; it is large because the scene above it is the point. */}
      <div className="relative mx-auto w-full max-w-5xl px-5 pb-20 pt-[clamp(17rem,40vw,33rem)] sm:px-8 sm:pb-24">
        <div className="max-w-2xl">
          <Reveal>
            <h1 className="display text-balance text-[2.15rem] text-white min-[400px]:text-[2.7rem] sm:text-[3.9rem] lg:text-[4.4rem]">
              Stop guessing.
              <br />
              Start building your edge.
            </h1>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mt-5 max-w-lg text-[16px] leading-[1.6] text-white/55 sm:mt-6 sm:text-[17.5px]">
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
                  "h-11 rounded-full px-6 text-[14.5px] font-semibold",
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
                className="text-[14.5px] text-white/60 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                See how it works
              </Link>
            </div>
          </Reveal>

          {/* Below `md` the stage drops its pinned cards — there is no room to
              float a 232px card over a 350px plane without covering the curve
              it points at. They run here instead, where they are legible. */}
          <Reveal delay={0.2}>
            <HeroStageCards className="mt-10 max-w-[232px] md:hidden" />
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-8 max-w-md text-[12.5px] leading-relaxed text-white/35">
              Illustrative setups and an illustrative playbook. Private by
              construction — nothing connects to your broker. Free while we
              build it.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
