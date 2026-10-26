"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import { LEVELS, RISK_REWARD_LABEL, SESSION } from "@/features/marketing/data/nq-session";
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
      <motion.div
        // Visible from the first paint: `opacity: 0` here would be
        // server-rendered inline and lift only once the script hydrates, which
        // is how these mockups end up as blank gaps on a slow device.
        initial={{ opacity: 1, rotateX: 22, rotateY: reverse ? -16 : 16 }}
        whileInView={{
          opacity: 1,
          rotateX: 13,
          rotateY: reverse ? -21 : 21,
          rotateZ: reverse ? 3.5 : -3.5,
        }}
        viewport={{ once: true, amount: 0.15, margin: "50px" }}
        transition={{ duration: 1.2, ease: ENTER }}
        className="relative w-full max-w-3xl origin-center scale-[0.8] min-[400px]:scale-[0.88] sm:w-[104%] sm:scale-100"
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

const CAPTURE_CANDLES = [
  { x: 40, top: 96, height: 44, bull: false },
  { x: 72, top: 128, height: 52, bull: false },
  { x: 104, top: 168, height: 26, bull: true, sweep: true },
  { x: 136, top: 120, height: 62, bull: true },
  { x: 168, top: 80, height: 52, bull: true },
  { x: 200, top: 52, height: 38, bull: true },
  { x: 232, top: 40, height: 30, bull: true },
];

function CaptureMockup() {
  return (
    <Panel className="flex h-72 w-full sm:h-80">
      <div className="flex w-10 flex-col items-center gap-4 border-r border-black/[0.05] bg-canvas py-3 text-fg-muted/50 dark:border-white/[0.06]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "size-4 rounded-[5px]",
              i === 0 ? "bg-accent/70" : "bg-fg-subtle/20",
            )}
          />
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-3 py-2 dark:border-white/[0.06]">
          <span className="text-[12px] font-semibold tracking-tight text-fg">
            {SESSION.label}
          </span>
          <span className="numeric text-[10.5px] text-accent">15m</span>
          <span className="numeric ml-auto text-[10.5px] text-fg-subtle">
            {LEVELS.live}
          </span>
        </div>

        <svg
          viewBox="0 0 280 200"
          width="280"
          height="200"
          preserveAspectRatio="none"
          className="block h-[calc(100%-2.1rem)] w-full"
          aria-hidden="true"
        >
          {CAPTURE_CANDLES.map((candle) => (
            <g key={candle.x}>
              <line
                x1={candle.x}
                x2={candle.x}
                y1={candle.top - 14}
                y2={candle.top + candle.height + (candle.sweep ? 46 : 14)}
                className={candle.bull ? "stroke-positive" : "stroke-negative"}
                strokeWidth="1.5"
              />
              <rect
                x={candle.x - 4}
                y={candle.top}
                width="8"
                height={candle.height}
                rx="1.5"
                className={candle.bull ? "fill-positive" : "fill-negative"}
              />
            </g>
          ))}

          {/* The long-position tool: reward above the entry, risk below it. */}
          <rect
            x="120"
            y="36"
            width="150"
            height="96"
            className="fill-positive-soft stroke-positive/50"
            strokeWidth="1.5"
          />
          <rect
            x="120"
            y="132"
            width="150"
            height="32"
            className="fill-negative-soft stroke-negative/50"
            strokeWidth="1.5"
          />
          <line
            x1="108"
            x2="278"
            y1="132"
            y2="132"
            className="stroke-fg-muted"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          {/* The label sits on its own plate: the candles run straight through
              this part of the box, and a number half-hidden behind one is
              worse than no number. */}
          <rect
            x="166"
            y="72"
            width="58"
            height="24"
            rx="5"
            className="fill-surface stroke-positive/30"
            strokeWidth="1"
          />
          <text
            x="195"
            y="89"
            textAnchor="middle"
            className="fill-positive font-mono text-[15px] font-semibold"
          >
            {RISK_REWARD_LABEL}
          </text>
        </svg>
      </div>

      <div className="numeric flex w-12 flex-col justify-between border-l border-black/[0.05] bg-canvas py-3 text-center text-[8.5px] text-fg-subtle dark:border-white/[0.06]">
        <span>{LEVELS.target}</span>
        <span>{LEVELS.target - 75}</span>
        <span className="mx-1 rounded bg-accent py-0.5 text-accent-fg">
          {LEVELS.live}
        </span>
        <span>{LEVELS.entry}</span>
        <span>{LEVELS.stop}</span>
      </div>
    </Panel>
  );
}

/* ========================================================================== */
/* 2 — Organize                                                               */
/* ========================================================================== */

const VAULT_ROWS = [
  { pair: SESSION.label, play: "London breakout", r: `+${RISK_REWARD_LABEL}`, win: true },
  { pair: "EURUSD", play: "Asian range fade", r: "−1.0R", win: false },
  { pair: "XAUUSD", play: "Liquidity sweep", r: "+1.8R", win: true },
  { pair: "NQ100", play: "Opening drive", r: "+2.4R", win: true },
];

function OrganizeMockup() {
  return (
    <div className="relative flex w-full items-center justify-center">
      {/* The two records behind the one in front. */}
      <div className="absolute h-[16rem] w-[78%] translate-x-5 translate-y-9 rounded-2xl border border-black/[0.06] bg-surface opacity-40 dark:border-white/[0.07]" />
      <div className="absolute h-[16rem] w-[86%] translate-x-2.5 translate-y-4 rounded-2xl border border-black/[0.06] bg-surface opacity-70 dark:border-white/[0.07]" />

      <Panel className="relative w-[94%]">
        <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3 dark:border-white/[0.06]">
          <span className="text-[12.5px] font-semibold tracking-tight text-fg">
            Your library
          </span>
          <span className="numeric ml-auto text-[11px] text-fg-subtle">
            248 setups
          </span>
        </div>

        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {VAULT_ROWS.map((row) => (
            <li key={row.play} className="flex items-center gap-3 px-4 py-3">
              <span className="size-7 shrink-0 rounded-md bg-accent-soft" />
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-medium tracking-tight text-fg">
                  {row.pair}
                </p>
                <p className="truncate text-[11px] text-fg-subtle">{row.play}</p>
              </div>
              <span
                className={cn(
                  "stat ml-auto text-[13px]",
                  row.win ? "text-positive" : "text-negative",
                )}
              >
                {row.r}
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
      <FloatingCard className="w-full max-w-[20rem] lg:absolute lg:bottom-2 lg:-left-10 lg:z-10 lg:w-[14.5rem]">
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

      <ol className="relative mt-12 flex flex-col gap-12 sm:mt-16 sm:gap-16 lg:gap-6">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            // Text left, mockup right, on every step. An alternating layout
            // was tried and thrown away: swapping the order meant whichever
            // column held the mockup changed width with it, so two of the
            // three mockups rendered squeezed. Within a single ordered list,
            // consistency is the readable choice — the variety the page needs
            // is between sections, not between items of one list.
            className="relative grid grid-cols-1 items-center gap-x-10 gap-y-6 lg:grid-cols-[2.25rem_minmax(0,21rem)_minmax(0,1fr)]"
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

            <Reveal>
              <h3 className="display text-[1.6rem] text-fg sm:text-[2.1rem]">
                {step.title}
              </h3>
              <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted sm:text-[16.5px]">
                {step.body}
              </p>
            </Reveal>

            <div className="relative">
              {/* `reverse` yaws the panel so its left edge recedes, which is
                  what keeps the bottom-left corner clear for the glass card
                  above. Same sign on every step, so the cards land in the
                  same place each time rather than wherever there happened to
                  be room. */}
              <IsometricStage reverse>{step.mockup}</IsometricStage>
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
        ))}
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
