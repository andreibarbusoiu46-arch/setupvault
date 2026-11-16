import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { GlobeMount } from "@/features/marketing/components/globe/globe-mount";
import { Reveal } from "@/features/marketing/components/reveal";
import { cn } from "@/lib/utils";

/**
 * The hero: a globe of particles, and a sentence about whose data it is.
 *
 * This band is dark in both themes, which is the one place on the site that
 * is true. Everything else is token-driven and flips with the toggle, but a
 * sphere lit from inside only exists against a dark field — put it on paper
 * and the glow becomes a grey smudge. So the hero is treated as a window cut
 * into the page rather than part of its surface, and it hands over to
 * `--canvas` at the bottom edge so the next section meets it cleanly in
 * either theme.
 *
 * It is a server component. Nothing above the fold needs client JavaScript to
 * become readable: the copy, the links and the still sphere are all in the
 * first response, and the canvas layers itself on top once it loads.
 */

/** Sample figures. Labelled on the page, never presented as anyone's record. */
const PANELS = [
  {
    label: "Setup Score",
    value: "A+",
    detail: "94 / 100",
    meta: "XAUUSD · Long",
    tone: "accent",
    place: "left-0 top-[4%] lg:-left-6 lg:top-[14%]",
    drift: "0s",
    onPhone: true,
  },
  {
    label: "Win rate",
    value: "68.4%",
    detail: "Last 90 days",
    meta: "142 setups",
    tone: "positive",
    place: "right-0 top-[4%] lg:-right-4 lg:top-[6%]",
    drift: "-2.6s",
    // Dropped on a phone. Three cards on a 272px globe is not a composition,
    // it is a stack: at 390 the first two met in the middle and the third
    // covered the lit shoulder. Two, diagonally opposed, leave the object
    // readable — which is the whole reason it is there.
    onPhone: false,
  },
  {
    label: "Pattern found",
    value: "1:3 R",
    detail: "London sweep",
    meta: "11 of 14 won",
    tone: "cyan",
    place: "right-0 bottom-[4%] lg:right-0 lg:bottom-[12%]",
    drift: "-5.1s",
    onPhone: true,
  },
] as const;

function Panel({ panel }: { panel: (typeof PANELS)[number] }) {
  const tone =
    panel.tone === "positive"
      ? "text-[#20C997]"
      : panel.tone === "cyan"
        ? "text-[#51D8FF]"
        : "text-[#8FB8FF]";

  return (
    <div
      className={cn(
        "sv-drift absolute w-[7.6rem] rounded-2xl p-2.5 backdrop-blur-xl sm:w-[10.5rem] sm:p-3.5",
        panel.onPhone ? "block" : "hidden sm:block",
        panel.place,
      )}
      style={{
        animationDelay: panel.drift,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.025))",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255,255,255,0.14), 0 24px 48px -24px rgba(2,6,16,0.9)",
      }}
    >
      <p className="text-[11px] font-medium text-[#929BAA]">{panel.label}</p>
      <p className={cn("stat mt-1 text-[1.3rem] leading-none sm:text-[1.5rem]", tone)}>
        {panel.value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[#C8D0DE]">{panel.detail}</p>
      <p className="mt-0.5 text-[11px] text-[#7E8798]">{panel.meta}</p>
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ backgroundColor: "#05070B" }}
    >
      {/* Ambient light. One source, cooling towards its edge — the same
          description the globe's own shader uses, so the page and the object
          in it are lit by the same thing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70rem 48rem at 72% 18%, rgba(52,120,246,0.22), transparent 62%)," +
            "radial-gradient(42rem 32rem at 78% 10%, rgba(81,216,255,0.10), transparent 60%)",
        }}
      />
      {/* A grid far enough down in contrast to be felt rather than read. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,170,255,0.055) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(120,170,255,0.055) 1px, transparent 1px)",
          backgroundSize: "68px 68px",
          maskImage:
            "radial-gradient(76% 62% at 50% 34%, #000 30%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(76% 62% at 50% 34%, #000 30%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-28 sm:px-8 sm:pb-28 sm:pt-32 lg:grid lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-32 lg:pt-36">
        {/* The globe.
            First in the DOM below `lg` so a phone meets the object before the
            argument, and placed into the second column at `lg` without being
            re-rendered. */}
        <div className="order-first mb-10 lg:order-last lg:col-span-7 lg:mb-0">
          {/* Sized so the headline still starts above the fold on a 844pt
              phone: nav, padding and a 272px globe leave the eyebrow at
              roughly 490px down a 844px screen. A globe that pushes the
              sentence off the screen is not a hero. */}
          <div className="relative mx-auto aspect-square w-[min(17rem,68vw)] sm:w-[min(24rem,70vw)] lg:w-full lg:max-w-[34rem]">
            <GlobeMount className="absolute inset-[-6%]" />
            {PANELS.map((panel) => (
              <Panel key={panel.label} panel={panel} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-5">
          <Reveal>
            <p className="text-[12.5px] font-medium tracking-[-0.005em] text-[#8FB8FF]">
              Your personal trading intelligence workspace
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="display mt-4 text-balance text-[2.3rem] text-[#F5F7FB] min-[400px]:text-[2.75rem] sm:text-[3.4rem] lg:text-[3.6rem]">
              Your edge. Your data.
              <br />
              Your intelligence.
            </h1>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mt-5 max-w-md text-[16px] leading-[1.62] text-[#929BAA] sm:text-[17px]">
              Turn every trade into structured knowledge. Organise your setups,
              understand your performance, and find the patterns behind the
              decisions you already made.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="sv-hero-cta sv-sheen relative h-11 overflow-hidden rounded-full px-6 text-[14.5px] font-semibold"
              >
                <Link href={ROUTES.signup}>Start building your edge</Link>
              </Button>

              <Button
                asChild
                size="lg"
                variant="ghost"
                className="sv-hero-ghost h-11 rounded-full px-6 text-[14.5px] font-medium backdrop-blur-xl"
              >
                <Link href="#how">Explore SetupVault</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.26}>
            <p className="mt-8 max-w-sm text-[12.5px] leading-relaxed text-[#7E8798]">
              The figures on the globe are illustrative. Private by
              construction — nothing connects to your broker. Free while we
              build it.
            </p>
          </Reveal>
        </div>
      </div>

      {/* The hand-off. The hero is dark in both themes; this takes it down to
          whatever the page underneath actually is. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--canvas) 72%, transparent) 62%, var(--canvas) 100%)",
        }}
      />
    </section>
  );
}
