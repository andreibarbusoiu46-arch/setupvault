"use client";

import { motion } from "framer-motion";
import { Check, FileText, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import { CaptureChart } from "@/features/marketing/components/capture-chart";
import { AnimatedNumber } from "@/features/marketing/components/animated-number";
import { useSequence } from "@/features/marketing/lib/use-sequence";
import { LEVELS, RISK_REWARD, SESSION } from "@/features/marketing/data/nq-session";
import {
  COMPONENT_LABELS,
  MAX_SCORE,
  WEIGHTS,
  type ScoreComponent,
} from "@/features/setup-score/constants";
import { gradeFor } from "@/features/setup-score/utils/score";
import {
  EXPECTANCY_LABEL,
  NET_R_LABEL,
  TRADE_COUNT,
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

function CaptureMockup({ step }: { step: number }) {
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

      <CaptureChart step={step} />
    </Panel>
  );
}

/**
 * The capture sequence, in milliseconds from the moment the section is seen.
 *
 * Read it as a sentence: the session draws, the entry goes on, the risk and
 * reward open around it, the R multiple lands, and only then does the
 * product say it saved anything. The last two are deliberately a beat apart
 * — a confirmation that arrives at the same instant as the thing it is
 * confirming reads as decoration rather than as a response.
 */
const CAPTURE_AT = [120, 1500, 1950, 2500, 2900] as const;

/** 1 candles · 2 entry · 3 levels · 4 R plate · 5 saved */
function CaptureStage() {
  const { ref, step } = useSequence<HTMLDivElement>({ at: CAPTURE_AT, amount: 0.25 });

  return (
    <div ref={ref} className="relative">
      <IsometricStage reverse>
        <CaptureMockup step={step} />
      </IsometricStage>

      {/* The saved confirmation. Outside the tilted node, like every other
          glass card in this file: a backdrop blur inside a preserve-3d
          context is dropped by WebKit, and the card renders as a flat
          rectangle with nothing behind it. */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2",
          "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          step >= 5
            ? "translate-y-0 opacity-100"
            : "-translate-y-2 opacity-0",
        )}
      >
        <div className="glass-note glass-note-accent flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-xl backdrop-saturate-150">
          <Check className="size-3 shrink-0 text-positive" aria-hidden="true" />
          <span className="text-[11.5px] font-medium text-fg">Setup saved</span>
        </div>
      </div>

      <div className="mt-6 flex justify-center lg:mt-0 lg:block">
        <FloatingCard className="sv-slide-in w-full max-w-[20rem] lg:absolute lg:-left-10 lg:bottom-2 lg:z-10 lg:w-[15.5rem]">
          <p className="text-[11.5px] font-semibold tracking-tight text-accent">
            Setup thesis
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-fg">
            Swept the Asian low, reclaimed it on the 15m. Entry on the retest,
            stop below the wick.
          </p>

          {/* The levels, filled in as the chart draws them, so the card and
              the chart are plainly the same record. */}
          <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-2.5">
            {[
              { label: "Entry", value: LEVELS.entry, at: 2, tone: "text-fg" },
              { label: "Stop", value: LEVELS.stop, at: 3, tone: "text-negative" },
              { label: "Target", value: LEVELS.target, at: 3, tone: "text-positive" },
            ].map((level) => (
              <div key={level.label}>
                <dt className="text-[9.5px] text-fg-subtle">{level.label}</dt>
                <dd className={cn("numeric text-[11.5px] font-semibold", level.tone)}>
                  <AnimatedNumber
                    value={level.value}
                    run={step >= level.at}
                    duration={0.8}
                    format={(v) => Math.round(v).toLocaleString("en-US")}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </FloatingCard>
      </div>
    </div>
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
    direction: "Long",
    score: 94,
  },
  {
    pair: "EURUSD",
    play: "Asian range fade",
    ratio: -1,
    win: false,
    direction: "Short",
    score: 61,
  },
  {
    pair: "XAUUSD",
    play: "Liquidity sweep",
    ratio: 1.8,
    win: true,
    direction: "Long",
    score: 88,
  },
  {
    pair: "NQ100",
    play: "Opening drive",
    ratio: 2.4,
    win: true,
    direction: "Long",
    score: 79,
  },
] as const;

/** "+4.2R" / "−1.0R", with a real minus sign rather than a hyphen. */
function rLabel(ratio: number) {
  return `${ratio < 0 ? "\u2212" : "+"}${Math.abs(ratio).toFixed(1)}R`;
}

/**
 * The library, searching itself.
 *
 * `step`: 1 the field is focused and the query types · 2 the count lands ·
 * 3 the rows arrive, staggered · 4 the first result is selected.
 *
 * The query types in CSS — a width animation in `ch` units over hidden
 * overflow — rather than by slicing a string in React. Six characters would
 * otherwise be six renders of the whole panel, and the caret has to keep its
 * place between them.
 */
function OrganizeMockup({ step }: { step: number }) {
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
          <span
            className="numeric ml-auto text-[11px] text-fg-subtle transition-opacity duration-300"
            style={{ opacity: step >= 2 ? 1 : 0 }}
          >
            4 of 248
          </span>
        </div>

        <div className="border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
          <div
            className={cn(
              "flex h-7 items-center gap-2 rounded-md border bg-canvas px-2 text-[11px]",
              "transition-colors duration-300",
              step >= 1 ? "border-accent/50 text-fg" : "border-border text-fg-subtle",
            )}
          >
            <Search className="size-3 shrink-0" aria-hidden="true" />
            {step >= 1 ? (
              <span className="sv-type inline-block whitespace-nowrap align-bottom">
                XAUUSD
              </span>
            ) : (
              <span>Search setups…</span>
            )}
            <span className="numeric ml-auto rounded border border-border px-1 text-[9px]">
              /
            </span>
          </div>
        </div>

        <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
          {VAULT_ROWS.map((row, index) => {
            const shown = step >= 3;
            return (
            <li
              key={row.play}
              className={cn(
                "glass-row flex items-center gap-3 rounded-lg px-4 py-2.5",
                // The first result is the one the query matched, so it is
                // the one that gets picked out — not an arbitrary highlight.
                step >= 4 && index === 0 && "bg-accent-soft",
              )}
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translate3d(0,0,0)" : "translate3d(0,8px,0)",
                transition:
                  "opacity 420ms cubic-bezier(0.32,0.72,0,1), transform 420ms cubic-bezier(0.32,0.72,0,1), background-color 300ms linear",
                transitionDelay: shown ? `${index * 90}ms` : "0ms",
              }}
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  row.win ? "bg-positive" : "bg-negative",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="numeric flex items-center gap-1.5 truncate text-[12.5px] font-semibold tracking-tight text-fg">
                  {row.pair}
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[8.5px] font-medium",
                      row.direction === "Long"
                        ? "bg-positive-soft text-positive"
                        : "bg-negative-soft text-negative",
                    )}
                  >
                    {row.direction}
                  </span>
                </p>
                <p className="truncate text-[11px] text-fg-subtle">{row.play}</p>
              </div>

              {/* The setup score, which is a grade out of 100 and not an
                  opinion about the market. */}
              <span className="glass-chip numeric hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] text-fg-muted sm:inline-block">
                {row.score}
              </span>

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
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/** 1 query types · 2 count · 3 rows · 4 selection */
const ORGANIZE_AT = [150, 1000, 1250, 2100] as const;

function OrganizeStage() {
  const { ref, step } = useSequence<HTMLDivElement>({ at: ORGANIZE_AT, amount: 0.25 });

  return (
    <div ref={ref} className="relative">
      <IsometricStage>
        <OrganizeMockup step={step} />
      </IsometricStage>
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

/**
 * The performance panel, counting itself up.
 *
 * `step`: 1 the win rate counts · 2 the bars grow from the baseline ·
 * 3 the session labels and the net figure land · 4 the three summary
 * figures arrive.
 *
 * Every number here is computed from the R sequence in `playbook.ts`, not
 * typed: the win rate, the expectancy and the net are all derived from the
 * same sixty trades, so they cannot drift apart. The sequence is
 * illustrative and the hero says so.
 */
function AnalyzeMockup({ step }: { step: number }) {
  return (
    <Panel className="w-full p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11.5px] text-fg-subtle">Playbook win rate</p>
          <p className="stat mt-1.5 text-[2.6rem] leading-none text-fg">
            <AnimatedNumber
              value={WIN_RATE}
              run={step >= 1}
              duration={1.2}
              format={(v) => v.toFixed(1)}
            />
            %
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 rounded-lg border border-positive/20 bg-positive-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-positive transition-all duration-500"
          style={{
            opacity: step >= 3 ? 1 : 0,
            transform: step >= 3 ? "none" : "translateY(-4px)",
          }}
        >
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
          {SESSIONS.map((session, index) => (
            <div
              key={session.label}
              className={cn(
                "min-w-0 flex-1 origin-bottom rounded-t-md",
                session.value > 70 ? "bg-accent" : "bg-accent-soft",
              )}
              // Height stays fixed and the bar is scaled, so growth happens
              // on the compositor instead of relaying out the row five
              // times a frame.
              style={{
                height: `${session.value}%`,
                transform: step >= 2 ? "scaleY(1)" : "scaleY(0)",
                transition: "transform 700ms cubic-bezier(0.32, 0.72, 0, 1)",
                transitionDelay: step >= 2 ? `${index * 80}ms` : "0ms",
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2.5">
          {SESSIONS.map((session, index) => (
            <span
              key={session.label}
              className="min-w-0 flex-1 truncate text-center text-[9.5px] text-fg-subtle transition-opacity duration-300"
              style={{
                opacity: step >= 3 ? 1 : 0,
                transitionDelay: step >= 3 ? `${index * 60}ms` : "0ms",
              }}
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
          { label: "Sample", value: `${TRADE_COUNT} trades` },
        ].map((item, index) => (
          <div
            key={item.label}
            className="min-w-0 transition-all duration-500"
            style={{
              opacity: step >= 4 ? 1 : 0,
              transform: step >= 4 ? "none" : "translateY(6px)",
              transitionDelay: step >= 4 ? `${index * 90}ms` : "0ms",
            }}
          >
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

/** 1 win rate · 2 bars · 3 labels and net · 4 summary */
const ANALYZE_AT = [150, 700, 1500, 1900] as const;

function AnalyzeStage() {
  const { ref, step } = useSequence<HTMLDivElement>({ at: ANALYZE_AT, amount: 0.25 });

  return (
    <div ref={ref} className="relative">
      <IsometricStage reverse>
        <AnalyzeMockup step={step} />
      </IsometricStage>
    </div>
  );
}

/* ========================================================================== */
/* The three steps                                                            */
/* ========================================================================== */

/**
 * Each step owns its whole stage now, rather than handing back a mockup and
 * a card for the list to assemble. The sequences differ per step — the chart
 * draws, the library searches, the dashboard counts — and a list that tried
 * to orchestrate all three from outside would need to know what each one is.
 */
const STEPS = [
  {
    title: "Capture the moment, not the aftermath.",
    body: "Save the chart you were actually looking at, with your levels drawn on it and the thesis in your own words — while the trade is still open and you still remember why.",
    stage: <CaptureStage />,
  },
  {
    title: "One library, in your own vocabulary.",
    body: "Name a play once and reuse it. Tags, markets and sessions become the structure of the library, so finding the last twelve times you took this exact setup is one query, not an afternoon of scrolling.",
    stage: <OrganizeStage />,
  },
  {
    title: "The numbers you would have worked out by hand.",
    body: "Expectancy by playbook, by session, by market. Not a wall of every statistic that exists — the few that change what you do on Monday.",
    stage: <AnalyzeStage />,
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
              {step.stage}
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

/**
 * The demonstration setup's score, in the product's own units.
 *
 * The components and their ceilings are imported from the scoring module
 * rather than retyped, so the mockup cannot drift from the rules the app
 * actually applies, and the grade is read off `gradeFor` rather than
 * asserted. The points below sum to 94, which is what the ring draws and
 * what the figure counts to.
 *
 * The previous version had the ring at 88% of its circumference with "A+"
 * in the middle, and the app's own grade table puts A+ at 90 and above. The
 * picture disagreed with the product it was advertising.
 */
const DEMO_POINTS: Record<ScoreComponent, number> = {
  riskReward: 20,
  stopLoss: 20,
  takeProfit: 15,
  entry: 18,
  strategy: 13,
  documentation: 8,
};

const DEMO_SCORE = Object.values(DEMO_POINTS).reduce((sum, n) => sum + n, 0);
const DEMO_GRADE = gradeFor(DEMO_SCORE);

/** 2 * PI * r, for the ring below. */
const RING = 2 * Math.PI * 34;

function AiReviewMockup({ step }: { step: number }) {
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
                strokeDasharray={RING}
                transform="rotate(-90 40 40)"
                style={{
                  strokeDashoffset:
                    step >= 2 ? RING * (1 - DEMO_SCORE / MAX_SCORE) : RING,
                  transition: "stroke-dashoffset 1100ms cubic-bezier(0.32, 0.72, 0, 1)",
                }}
              />
            </svg>
            <span className="stat absolute inset-0 flex items-center justify-center text-[1.35rem] text-fg">
              <AnimatedNumber
                value={DEMO_SCORE}
                run={step >= 2}
                duration={1.1}
                format={(v) => String(Math.round(v))}
              />
            </span>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14.5px] font-semibold leading-tight tracking-tight text-fg">
              You followed the plan you wrote.
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-fg-muted">
              The exit cost you 1.1R against your own target. Everything before
              it was executed as written.
            </p>
            <span
              className="glass-chip mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium text-fg transition-all duration-500"
              style={{
                opacity: step >= 4 ? 1 : 0,
                transform: step >= 4 ? "scale(1)" : "scale(0.92)",
              }}
            >
              <span className="stat text-positive">{DEMO_GRADE.grade}</span>
              <span className="text-fg-subtle">{DEMO_GRADE.summary}</span>
            </span>
          </div>
        </div>

        <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05] dark:divide-white/[0.06] dark:border-white/[0.06] sm:border-t-0">
          {CRITERIA.map((item, index) => (
            <li
              key={item.label}
              className="flex items-center gap-3 px-5 py-3 transition-all duration-400"
              style={{
                opacity: step >= 3 ? 1 : 0,
                transform: step >= 3 ? "none" : "translateX(8px)",
                transitionDelay: step >= 3 ? `${index * 90}ms` : "0ms",
              }}
            >
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

      {/* The breakdown, in the product's real components and ceilings. */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-3 border-t border-black/[0.05] px-5 py-4 sm:grid-cols-6 dark:border-white/[0.06]">
        {(Object.keys(WEIGHTS) as ScoreComponent[]).map((component, index) => {
          const points = DEMO_POINTS[component];
          const ceiling = WEIGHTS[component];
          return (
            <div key={component} className="min-w-0">
              <p className="truncate text-[9.5px] text-fg-subtle">
                {COMPONENT_LABELS[component]}
              </p>
              <p className="numeric mt-0.5 text-[11px] font-semibold text-fg">
                {points}
                <span className="text-fg-subtle">/{ceiling}</span>
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    "h-full origin-left rounded-full",
                    points === ceiling ? "bg-positive" : "bg-accent",
                  )}
                  style={{
                    width: `${(points / ceiling) * 100}%`,
                    transform: step >= 5 ? "scaleX(1)" : "scaleX(0)",
                    transition: "transform 620ms cubic-bezier(0.32, 0.72, 0, 1)",
                    transitionDelay: step >= 5 ? `${index * 70}ms` : "0ms",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** 1 panel · 2 ring and figure · 3 criteria · 4 grade · 5 breakdown · 6 done */
const REVIEW_AT = [100, 400, 1500, 2100, 2400, 3000] as const;

export function AiReview() {
  const { ref, step } = useSequence<HTMLDivElement>({ at: REVIEW_AT, amount: 0.2 });

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

      <div ref={ref} className="relative mx-auto mt-12 w-full max-w-4xl sm:mt-14">
        <Reveal>
          <AiReviewMockup step={step} />
        </Reveal>

        {/* What the model did, said once and without implying it did more.
            "Read" rather than "analysed", and nothing here claims a view on
            where the market goes next. */}
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 -top-3 z-20 -translate-x-1/2",
            "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            step >= 6 ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
        >
          <div className="glass-note glass-note-accent flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-xl backdrop-saturate-150">
            <Check className="size-3 shrink-0 text-positive" aria-hidden="true" />
            <span className="text-[11.5px] font-medium text-fg">
              Setup read against your plan
            </span>
          </div>
        </div>
      </div>

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

/**
 * The mapping step, mapping itself.
 *
 * `step`: 1 the file lands and is read · 2 the headers are detected ·
 * 3 each one connects to a field, in turn · 4 the counts settle.
 *
 * The connection is drawn as the arrow and the field name arriving together
 * per row, staggered, because that is the actual unit of work: one column
 * resolved. Animating all six at once would show a result, not a process.
 */
function ImportMockup({ step }: { step: number }) {
  return (
    <Panel className="w-full">
      <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
        <span className="text-[12.5px] font-semibold tracking-tight text-fg">
          Match the columns
        </span>
        <span
          className="numeric ml-auto text-[11px] text-fg-subtle transition-opacity duration-300"
          style={{ opacity: step >= 2 ? 1 : 0 }}
        >
          1,284 rows · comma
        </span>
      </div>

      {/* The file itself, which is the thing the reader actually recognises
          from their own machine. */}
      <div className="border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
        <div
          className="glass-chip flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-500"
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? "none" : "translateY(-6px)",
          }}
        >
          <FileText className="size-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span className="numeric truncate text-[11px] text-fg">
            statement-october.csv
          </span>
          <span
            className={cn(
              "ml-auto shrink-0 text-[10px] transition-colors duration-300",
              step >= 2 ? "text-positive" : "text-fg-subtle",
            )}
          >
            {step >= 2 ? "Read" : "Reading…"}
          </span>
        </div>
      </div>

      <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
        {MAPPED.map((row, index) => {
          const named = step >= 2;
          const linked = step >= 3;
          return (
            <li key={row.column} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="numeric w-[5.6rem] shrink-0 truncate text-[11.5px] text-fg-muted transition-opacity duration-300"
                style={{
                  opacity: named ? 1 : 0,
                  transitionDelay: named ? `${index * 70}ms` : "0ms",
                }}
              >
                {row.column}
              </span>
              <span
                className="shrink-0 text-[11px] text-fg-subtle transition-all duration-300"
                style={{
                  opacity: linked ? 1 : 0,
                  transform: linked ? "none" : "translateX(-4px)",
                  transitionDelay: linked ? `${index * 110}ms` : "0ms",
                }}
                aria-hidden="true"
              >
                →
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[12px] font-medium transition-all duration-300",
                  row.state === "exact" ? "text-fg" : "text-fg-subtle",
                )}
                style={{
                  opacity: linked ? 1 : 0,
                  transform: linked ? "none" : "translateX(-6px)",
                  transitionDelay: linked ? `${index * 110}ms` : "0ms",
                }}
              >
                {row.field}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-300",
                  row.state === "exact"
                    ? "bg-positive-soft text-positive"
                    : "bg-accent-soft text-accent-on-soft",
                )}
                style={{
                  opacity: linked ? 1 : 0,
                  transform: linked ? "scale(1)" : "scale(0.9)",
                  transitionDelay: linked ? `${index * 110 + 90}ms` : "0ms",
                }}
              >
                {row.state === "exact" ? "Exact" : "Needs you"}
              </span>
            </li>
          );
        })}
      </ul>

      <div
        className="flex items-center gap-2 border-t border-black/[0.05] px-4 py-2.5 transition-opacity duration-500 dark:border-white/[0.06]"
        style={{ opacity: step >= 4 ? 1 : 0 }}
      >
        <span className="numeric text-[11px] text-fg-muted">
          <AnimatedNumber
            value={1281}
            run={step >= 4}
            duration={0.9}
            format={(v) => Math.round(v).toLocaleString("en-US")}
          />
          {" ready"}
        </span>
        <span className="numeric ml-auto text-[11px] text-fg-subtle">
          3 already in your library
        </span>
      </div>
    </Panel>
  );
}

/** 1 file lands · 2 headers read · 3 columns connect · 4 counts settle · 5 done */
const IMPORT_AT = [150, 900, 1300, 2300, 2700] as const;

export function BringItIn() {
  const { ref, step } = useSequence<HTMLDivElement>({ at: IMPORT_AT, amount: 0.25 });

  return (
    <Section id="import" className="border-t border-border">
      {/* Visual left, prose right — the mirror of the step above it, so the
          page alternates between sections rather than inside them. */}
      <div className="grid grid-cols-1 items-center gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div ref={ref} className="relative">
          <IsometricStage>
            <ImportMockup step={step} />
          </IsometricStage>

          {/* The confirmation, over the stage rather than inside it. */}
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2",
              "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
              step >= 5 ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
            )}
          >
            <div className="glass-note glass-note-accent flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-xl backdrop-saturate-150">
              <Check className="size-3 shrink-0 text-positive" aria-hidden="true" />
              <span className="text-[11.5px] font-medium text-fg">
                1,281 trades imported
              </span>
            </div>
          </div>

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
