"use client";

import { motion } from "framer-motion";
import { Check, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import { CaptureChart } from "@/features/marketing/components/capture-chart";
import { RISK_REWARD, SESSION } from "@/features/marketing/data/nq-session";
import {
  EXPECTANCY_LABEL,
  NET_R_LABEL,
  WIN_RATE,
} from "@/features/marketing/data/playbook";

/**
 * How the product works, and then the execution review.
 *
 * This file used to render four sections that were the same section four
 * times: icon chip, heading, paragraph, isometric mockup, sides alternating.
 * At 1440 they measured 744px each — 2976px, better than a third of the page
 * spent on one repeated composition, which is how a page stops reading as
 * art-directed and starts reading as a template with the content swapped out.
 *
 * Now the three steps are one band with one heading, strung on a numbered
 * spine. The numbers are not decoration: capture happens before you organise,
 * and organising happens before there is anything to analyse. Where content is
 * genuinely a sequence, numbering it is information.
 *
 * The review that follows is deliberately built the other way round — flat to
 * the viewer, centred, mockup-led — because it is not a fourth step. It is
 * what the library hands back once the three are habit.
 *
 * Two rules apply inside every tilted stage here, and both come from bugs that
 * were real on iOS:
 *
 * 1. No backdrop-filter inside the tilted node. WebKit drops a layer that
 *    carries one inside a `preserve-3d` context, so the mockup vanishes
 *    instead of frosting. Everything inside a stage is opaque; the glass lives
 *    on the cards that float outside it.
 *
 * 2. Nothing inside a stage animates opacity from zero. The mockups are
 *    present and visible in the server-rendered HTML; the scroll animation
 *    refines the angle, it does not reveal the content.
 */

const STAGE_3D = {
  WebkitTransformStyle: "preserve-3d",
  transformStyle: "preserve-3d",
  WebkitBackfaceVisibility: "hidden",
  backfaceVisibility: "hidden",
} as const;

const ENTER = [0.16, 1, 0.3, 1] as const;

/* ========================================================================== */
/* The stage                                                                  */
/* ========================================================================== */

function IsometricStage({
  children,
  className,
  reverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        // Trimmed from 520px at `sm`. The panels inside are 288–384px tall, so
        // the old stage carried 136px of empty room on every step — the kind
        // of gap that reads as a layout fault rather than as breathing space.
        // `overflow-visible` keeps the tilted card able to spill past the
        // stage; the width below is what stops that spill reaching the
        // document edge.
        "relative flex h-[250px] w-full items-center justify-center overflow-visible min-[400px]:h-[290px] sm:h-[400px]",
        className,
      )}
      style={{ WebkitPerspective: "1200px", perspective: "1200px" }}
    >
      {/* The breakpoint scale lives here rather than on the animated node:
          framer writes `scale` into the same transform a `scale-[0.8]`
          utility would, and whichever is applied last silently wins. */}
      <div className="w-full scale-[0.8] min-[400px]:scale-[0.88] sm:scale-100">
      <motion.div
        // Visible from the first paint: `opacity: 0` here would be
        // server-rendered inline and lift only once the script hydrates, which
        // is how these mockups end up as blank gaps on a slow device.
        initial={{ opacity: 1, scale: 0.95, rotateX: 22, rotateY: reverse ? -16 : 16 }}
        whileInView={{
          opacity: 1,
          scale: 1,
          rotateX: 13,
          rotateY: reverse ? -21 : 21,
          rotateZ: reverse ? 3.5 : -3.5,
        }}
        viewport={{ once: true, amount: 0.15, margin: "50px" }}
        transition={{ duration: 1.2, ease: ENTER }}
        className="relative w-full max-w-3xl origin-center sm:w-[104%]"
        style={STAGE_3D}
      >
        <motion.div
          // Below `sm` the mockup is scaled to 0.8, so 12px of travel arrives
          // as 9.6px over six seconds and reads as a still image. The yaw is
          // what sells it as a floating object rather than a sliding card; it
          // composes with the stage's own rotation above.
          animate={{ y: [0, -18, 0], rotateY: [0, -1.6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="h-full w-full"
          style={{ ...STAGE_3D, willChange: "transform" }}
        >
          {children}
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}

/** The frame every mockup sits in: opaque, hairline bordered, deeply shadowed. */
function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/[0.07] bg-surface dark:border-white/[0.08]",
        className,
      )}
      style={{ boxShadow: "var(--shadow-floating)" }}
    >
      {children}
    </div>
  );
}

/** A floating glass card. Rendered outside the tilted node, never inside it. */
function FloatingCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/[0.07] bg-white/70 p-4 backdrop-blur-2xl",
        "dark:border-white/[0.09] dark:bg-white/[0.06]",
        "shadow-[0_1px_1px_rgb(0_0_0/0.04),0_12px_28px_-10px_rgb(16_24_40/0.22),0_36px_72px_-36px_rgb(16_24_40/0.3)]",
        "dark:shadow-[0_1px_2px_rgb(0_0_0/0.6),0_14px_34px_-10px_rgb(0_0_0/0.7),0_40px_80px_-40px_rgb(0_0_0/1)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ========================================================================== */
/* 1 — Capture                                                                */
/* ========================================================================== */

function CaptureMockup() {
  return (
    <Panel className="flex h-72 w-full sm:h-80">
      {/* The platform's own left rail. */}
      <div className="flex w-8 flex-col items-center gap-3 border-r border-black/[0.05] bg-canvas py-2.5 dark:border-white/[0.06]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-[4px]",
              i === 0 ? "bg-accent/70" : "bg-fg-subtle/20",
            )}
          />
        ))}
      </div>

      <CaptureChart />
    </Panel>
  );
}

/* ========================================================================== */
/* 2 — Organize                                                               */
/* ========================================================================== */

/**
 * Four records, with their outcomes computed rather than typed.
 *
 * The first row is the session the chart beside step 1 is drawing, so the two
 * mockups agree: the same play, the same R multiple, derived from the same
 * levels. The rest carry their own geometry for the same reason — a library
 * whose numbers do not survive arithmetic is the thing this product claims to
 * replace.
 */
const VAULT_ROWS = [
  {
    pair: SESSION.label,
    play: "London breakout",
    ratio: RISK_REWARD,
    win: true,
  },
  { pair: "EURUSD", play: "Asian range fade", ratio: -1, win: false },
  { pair: "XAUUSD", play: "Liquidity sweep", ratio: 1.8, win: true },
  { pair: "NQ100", play: "Opening drive", ratio: 2.4, win: true },
] as const;

/** "+4.2R" / "−1.0R", with a real minus sign rather than a hyphen. */
function rLabel(ratio: number) {
  return `${ratio < 0 ? "\u2212" : "+"}${Math.abs(ratio).toFixed(1)}R`;
}

function OrganizeMockup() {
  return (
    <div className="relative flex w-full items-center justify-center">
      {/* The two records behind the one in front. */}
      <div className="absolute inset-y-0 w-[78%] translate-x-5 translate-y-9 rounded-2xl border border-black/[0.06] bg-surface opacity-40 dark:border-white/[0.07]" />
      <div className="absolute inset-y-0 w-[86%] translate-x-2.5 translate-y-4 rounded-2xl border border-black/[0.06] bg-surface opacity-70 dark:border-white/[0.07]" />

      <Panel className="relative w-[94%]">
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
          <span className="text-[12.5px] font-semibold tracking-tight text-fg">
            Your library
          </span>
          <span className="numeric ml-auto text-[11px] text-fg-subtle">
            248 setups
          </span>
        </div>

        {/* Search. Inert, and it reads as inert: no caret, no focus ring, no
            cursor-text. A mockup that looks typeable and is not is worse
            than one that plainly is not. */}
        <div className="border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
          <div className="flex h-7 items-center gap-2 rounded-md border border-border bg-canvas px-2 text-[11px] text-fg-subtle">
            <Search className="size-3 shrink-0" aria-hidden="true" />
            <span>Search setups…</span>
            <span className="numeric ml-auto rounded border border-border px-1 text-[9px]">
              /
            </span>
          </div>
        </div>

        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {VAULT_ROWS.map((row, index) => (
            <li
              key={row.play}
              // Staggered on scroll, by CSS. Four rows fading in from zero
              // under an IntersectionObserver, inside a preserve-3d stage, is
              // the one combination this file already warns against: a miss
              // leaves the rows permanently blank. This animation has
              // `opacity: 1` as its base state, so a timeline that never runs
              // simply shows the rows.
              className="sv-reveal-scroll flex items-center gap-3 px-4 py-2.5"
              style={{ "--sv-delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  row.win ? "bg-positive" : "bg-negative",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="numeric truncate text-[12.5px] font-semibold tracking-tight text-fg">
                  {row.pair}
                </p>
                <p className="truncate text-[11px] text-fg-subtle">{row.play}</p>
              </div>
              {/* The outcome carries its sign and its word-shape, not just a
                  hue: this green and this red sit dE 2.6 apart under
                  deuteranopia, so the leading + or minus is what actually
                  separates them. */}
              <span
                className={cn(
                  "numeric shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                  row.win
                    ? "bg-positive-soft text-positive"
                    : "bg-negative-soft text-negative",
                )}
              >
                {rLabel(row.ratio)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ========================================================================== */
/* 3 — Analyze                                                                */
/* ========================================================================== */

const SESSIONS = [
  { label: "London", value: 86 },
  { label: "New York", value: 64 },
  { label: "Asia", value: 28 },
  { label: "Overlap", value: 72 },
  { label: "Late NY", value: 18 },
];

function AnalyzeMockup() {
  return (
    <Panel className="w-full p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11.5px] text-fg-subtle">Playbook win rate</p>
          <p className="stat mt-1.5 text-[2.6rem] leading-none text-fg">
            {WIN_RATE}%
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-positive/20 bg-positive-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-positive">
          {NET_R_LABEL}
        </span>
      </div>

      {/* Bars and labels are separate rows on purpose. They used to share a
          flex column inside an `items-end` row, which left the column
          auto-height — so each bar's percentage resolved against nothing and
          collapsed, and the chart rendered as five labels under an empty
          band. As direct children of a fixed-height row the percentages
          resolve, and the labels sit below rather than under the bars. */}
      <div className="mt-7">
        <div className="flex h-24 items-end gap-2.5 sm:h-28">
          {SESSIONS.map((session) => (
            <div
              key={session.label}
              className={cn(
                "min-w-0 flex-1 rounded-t-md",
                session.value > 70 ? "bg-accent" : "bg-accent-soft",
              )}
              style={{ height: `${session.value}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2.5">
          {SESSIONS.map((session) => (
            <span
              key={session.label}
              className="min-w-0 flex-1 truncate text-center text-[9.5px] text-fg-subtle"
            >
              {session.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-black/[0.05] pt-5 dark:border-white/[0.06]">
        {[
          { label: "Expectancy", value: EXPECTANCY_LABEL },
          { label: "Best session", value: "London" },
          { label: "Streak", value: "6" },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="truncate text-[10.5px] text-fg-subtle">{item.label}</p>
            <p className="numeric mt-1 truncate text-[13.5px] font-semibold tracking-tight text-fg">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ========================================================================== */
/* The three steps                                                            */
/* ========================================================================== */

const STEPS = [
  {
    title: "Capture the moment, not the aftermath.",
    body: "Save the chart you were actually looking at, with your levels drawn on it and the thesis in your own words — while the trade is still open and you still remember why.",
    mockup: <CaptureMockup />,
    // Only this step keeps a glass card. It is the one that explains
    // something the mockup cannot — what "the thesis in your own words"
    // actually looks like. The other two had cards for symmetry, which is not
    // a reason, and one of them landed on the rows it was annotating.
    float: (
      <FloatingCard className="sv-slide-in w-full max-w-[20rem] lg:absolute lg:bottom-2 lg:-left-10 lg:z-10 lg:w-[14.5rem]">
        <p className="text-[11.5px] font-semibold tracking-tight text-accent">
          Setup thesis
        </p>
        <p className="mt-1.5 text-[13px] leading-snug text-fg">
          Swept the Asian low, reclaimed it on the 15m. Entry on the retest,
          stop below the wick.
        </p>
      </FloatingCard>
    ),
  },
  {
    title: "One library, in your own vocabulary.",
    body: "Name a play once and reuse it. Tags, markets and sessions become the structure of the library, so finding the last twelve times you took this exact setup is one query, not an afternoon of scrolling.",
    mockup: <OrganizeMockup />,
    float: null,
  },
  {
    title: "The numbers you would have worked out by hand.",
    body: "Expectancy by playbook, by session, by market. Not a wall of every statistic that exists — the few that change what you do on Monday.",
    mockup: <AnalyzeMockup />,
    float: null,
  },
] as const;

export function HowItWorks() {
  return (
    <Section id="how" className="border-t border-border">
      <SectionHeading
        title="From a screenshot to a pattern"
        description="Three habits, in the order they have to happen. The first one takes about forty seconds; the third one is the reason you did the first two."
      />

      <ol className="relative mt-14 flex flex-col gap-16 sm:mt-20 sm:gap-20 lg:gap-16">
        {STEPS.map((step, index) => {
          // Mirrored on every second step, which is what gives the sequence
          // a rhythm instead of three identical rows.
          //
          // An earlier attempt at this was reverted because swapping the
          // column order also swapped the track widths, so the mockup landed
          // in the 21rem text track and rendered squeezed. The fix is to
          // mirror the template rather than reorder within it: the mockup
          // holds the `1fr` track and the prose holds `21rem` on both sides,
          // so the two layouts are reflections of one another and nothing
          // changes size.
          const mirrored = index % 2 === 1;

          return (
          <li
            key={step.title}
            className={cn(
              "relative grid grid-cols-1 items-center gap-x-12 gap-y-6",
              mirrored
                ? "lg:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,21rem)]"
                : "lg:grid-cols-[2.25rem_minmax(0,21rem)_minmax(0,1fr)]",
            )}
          >
            {/* The spine. It carries the sequence, which is the one thing a
                reader has to understand about these three: they are ordered.
                `self-stretch` is what makes the rule reach the next marker
                instead of stopping as a stub under this one. */}
            <div className="flex items-center gap-4 self-stretch lg:flex-col lg:gap-3 lg:pt-1">
              <span
                className={cn(
                  "stat flex size-9 shrink-0 items-center justify-center rounded-full",
                  "border border-accent/25 bg-accent-soft text-[14px] text-accent-on-soft",
                )}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  className={cn(
                    "h-px flex-1 bg-gradient-to-r from-border via-border to-transparent",
                    "lg:h-auto lg:w-px lg:bg-gradient-to-b",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <Reveal className={mirrored ? "lg:order-3" : undefined}>
              <h3 className="display text-[1.6rem] text-fg sm:text-[2.1rem]">
                {step.title}
              </h3>
              <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted sm:text-[16.5px]">
                {step.body}
              </p>
            </Reveal>

            <div className={cn("relative", mirrored && "lg:order-2")}>
              {/* `reverse` yaws the panel so its left edge recedes, which is
                  what keeps the bottom-left corner clear for the glass card
                  above. Same sign on every step, so the cards land in the
                  same place each time rather than wherever there happened to
                  be room. */}
              {/* The yaw follows the side the panel sits on, so each mockup
                  turns its near edge towards the prose it belongs to rather
                  than away from it. */}
              <IsometricStage reverse={!mirrored}>{step.mockup}</IsometricStage>
              {/* On a phone the glass sits under the mockup. There is no room
                  to float a card over a 335px-wide screen without covering the
                  very rows it is commenting on; from `sm` up there is, and the
                  cards position themselves against this wrapper. */}
              {step.float ? (
                <div className="mt-6 flex justify-center lg:mt-0 lg:block">
                  {step.float}
                </div>
              ) : null}
            </div>
          </li>
          );
        })}
      </ol>
    </Section>
  );
}

/* ========================================================================== */
/* The execution review — not a fourth step                                   */
/* ========================================================================== */

const CRITERIA = [
  { label: "Entry taken at the level you wrote down", pass: true },
  { label: "Stop placed where the thesis said", pass: true },
  { label: "Size within the plan", pass: true },
  { label: "Exited two thirds early on a green candle", pass: false },
];

function AiReviewMockup() {
  return (
    <Panel className="w-full">
      <div className="flex items-center gap-2.5 border-b border-black/[0.05] px-5 py-4 dark:border-white/[0.06]">
        <p className="text-[13px] font-semibold tracking-tight text-fg">
          Execution review
        </p>
        <span className="numeric ml-auto text-[10.5px] text-fg-subtle">
          {SESSION.label} · 16 Oct
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-center gap-5 px-5 py-6 sm:border-r sm:border-black/[0.05] sm:dark:border-white/[0.06]">
          {/* The grade, as a ring rather than a badge: it is a score out of
              something, and the ring says so without a second label. */}
          <div className="relative size-[4.5rem] shrink-0">
            <svg viewBox="0 0 80 80" width="80" height="80" className="block size-full" aria-hidden="true">
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                className="stroke-border"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                className="stroke-positive"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="214"
                strokeDashoffset="26"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <span className="stat absolute inset-0 flex items-center justify-center text-[1.5rem] text-fg">
              A+
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold leading-tight tracking-tight text-fg">
              You followed the plan you wrote.
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-fg-muted">
              The exit cost you 1.1R against your own target. Everything before
              it was executed as written.
            </p>
          </div>
        </div>

        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05] dark:divide-white/[0.06] dark:border-white/[0.06] sm:border-t-0">
          {CRITERIA.map((item) => (
            <li key={item.label} className="flex items-center gap-3 px-5 py-3">
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full",
                  item.pass
                    ? "bg-positive-soft text-positive"
                    : "bg-negative-soft text-negative",
                )}
              >
                {item.pass ? (
                  <Check className="size-3" strokeWidth={2.4} />
                ) : (
                  <X className="size-3" strokeWidth={2.4} />
                )}
              </span>
              <p className="min-w-0 text-[12.5px] leading-snug text-fg-muted">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export function AiReview() {
  return (
    <Section id="review" className="border-t border-border">
      {/* Centred and flat to the viewer. Every other mockup on this page is
          tilted on a stage; this one is not, because it is the one screen you
          are meant to read rather than admire. */}
      <SectionHeading
        align="center"
        title="A second read on how you executed"
        description="The model never sees your broker and never predicts a price. It reads one setup against the rules you wrote for yourself, and names the thing that cost you the most — in plain language, with the evidence under it."
      />

      <Reveal className="mx-auto mt-12 w-full max-w-4xl sm:mt-14">
        <AiReviewMockup />
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mx-auto mt-6 max-w-xl text-center text-[13px] leading-relaxed text-fg-subtle">
          An illustration of the review screen. The criteria a real review
          checks are the ones in your own written plan, so no two look alike.
        </p>
      </Reveal>
    </Section>
  );
}

/* ========================================================================== */
/* Bringing an existing history in                                            */
/* ========================================================================== */

/**
 * The mapping step of the import wizard, as it actually behaves.
 *
 * Every column name on the left is a real header from a MetaTrader
 * statement, and every confidence chip is a value the mapper really
 * produces. "Contracts" is shown unresolved on purpose: it is the genuine
 * ambiguous case — Bybit uses it for the symbol, other venues use it for
 * quantity — and the product asks rather than guesses. A mockup that showed
 * six green ticks would be advertising a certainty the importer does not
 * claim.
 */
const MAPPED = [
  { column: "Symbol", field: "Ticker", state: "exact" },
  { column: "Type", field: "Direction", state: "exact" },
  { column: "Open Time", field: "Opened at", state: "exact" },
  { column: "S / L", field: "Stop loss", state: "exact" },
  { column: "Profit", field: "Net P&L", state: "exact" },
  { column: "Contracts", field: "Choose a field", state: "ask" },
] as const;

function ImportMockup() {
  return (
    <Panel className="w-full">
      <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
        <span className="text-[12.5px] font-semibold tracking-tight text-fg">
          Match the columns
        </span>
        <span className="numeric ml-auto text-[11px] text-fg-subtle">
          1,284 rows · comma
        </span>
      </div>

      <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
        {MAPPED.map((row, index) => (
          <li
            key={row.column}
            className="sv-reveal-scroll flex items-center gap-3 px-4 py-2.5"
            style={{ "--sv-delay": `${index * 70}ms` } as React.CSSProperties}
          >
            <span className="numeric w-[5.6rem] shrink-0 truncate text-[11.5px] text-fg-muted">
              {row.column}
            </span>
            <span className="shrink-0 text-[11px] text-fg-subtle" aria-hidden="true">
              →
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-[12px] font-medium",
                row.state === "exact" ? "text-fg" : "text-fg-subtle",
              )}
            >
              {row.field}
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                row.state === "exact"
                  ? "bg-positive-soft text-positive"
                  : "bg-accent-soft text-accent-on-soft",
              )}
            >
              {row.state === "exact" ? "Exact" : "Needs you"}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
        <span className="numeric text-[11px] text-fg-muted">
          1,281 ready
        </span>
        <span className="numeric ml-auto text-[11px] text-fg-subtle">
          3 already in your library
        </span>
      </div>
    </Panel>
  );
}

export function BringItIn() {
  return (
    <Section id="import" className="border-t border-border">
      {/* Visual left, prose right — the mirror of the step above it, so the
          page alternates between sections rather than inside them. */}
      <div className="grid grid-cols-1 items-center gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="relative">
          <IsometricStage>
            <ImportMockup />
          </IsometricStage>

          <div className="mt-6 flex justify-center lg:mt-0 lg:block">
            {/* Clear of the panel, not over it. At `bottom-2` the card landed
                across the last two mapping rows and the ready count — the
                exact rows it is commenting on, which is the one place it
                must not be. */}
            <FloatingCard className="sv-slide-in w-full max-w-[20rem] lg:absolute lg:-bottom-8 lg:-right-10 lg:z-10 lg:w-[15rem]">
              <p className="text-[11.5px] font-semibold tracking-tight text-accent">
                Before anything is written
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-fg">
                Every row is shown as it will be saved, with the dates and
                decimals it read — and whatever it could not read said out
                loud.
              </p>
            </FloatingCard>
          </div>
        </div>

        <Reveal>
          <h2 className="display text-[1.6rem] text-fg sm:text-[2.1rem]">
            Bring in the trades you already took.
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted sm:text-[16.5px]">
            Point it at a CSV from MetaTrader, TradingView, Binance, Bybit or
            cTrader. It works out the delimiter, which column is which, and
            whether 03/04 is March or April — then asks you about anything it
            genuinely cannot tell, instead of guessing and being wrong a
            thousand rows at a time.
          </p>
          <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted sm:text-[16.5px]">
            Trades you have already imported are recognised and skipped, so
            running the same statement twice does not double your history.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
