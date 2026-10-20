import { Camera, Filter, Lock, ShieldCheck } from "lucide-react";

import { RevealOnScroll } from "@/components/motion/reveal-on-scroll";
import { Section, SectionHeading } from "@/features/marketing/components/section";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { MAX_SCORE } from "@/features/setup-score/constants";
import { LEVELS } from "@/features/marketing/data/nq-session";
import { cn } from "@/lib/utils";

/**
 * The figure in the Setup Score cell, computed rather than typed.
 *
 * It used to be the string "88", while the product preview above said 87 for
 * the same feature. Both are now produced by the engine, from the levels of
 * the session the whole page is built around, so neither can drift from the
 * other or from the app.
 */
const EXAMPLE_SCORE = calculateSetupScore({
  direction: "long",
  ticker: "NQ100",
  market: "futures",
  tradedOn: "2026-10-16",
  entry: LEVELS.entry,
  stopLoss: LEVELS.stop,
  takeProfit: LEVELS.target,
  strategy: "London breakout",
  notesLength: 240,
  hasScreenshot: true,
  tagCount: 4,
});

/**
 * The bento.
 *
 * Three of the five cells are working miniatures of the product rather than an
 * icon above a sentence: a playbook comparison, a cost-of-mistakes ladder, and
 * a tagged record with its screenshot. A feature grid where every cell is an
 * icon and two lines is the clearest tell of a page that was assembled rather
 * than designed — and for this product the claim *is* the screen, so showing
 * the screen is both the honest and the stronger move.
 *
 * Cells are glass here. Nothing in this section is inside a 3D context, so the
 * backdrop blur composes correctly everywhere, including iOS.
 */

function Cell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "glass flex h-full min-w-0 flex-col rounded-2xl p-6 backdrop-blur-xl sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CellTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[17px] font-semibold leading-tight tracking-tight text-fg">
      {children}
    </h3>
  );
}

function CellBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2.5 text-[14px] leading-relaxed text-fg-muted">{children}</p>
  );
}

/* -------------------------------------------------------------------------- */

const PLAYBOOKS = [
  {
    name: "London breakout",
    winRate: 68.4,
    expectancy: "+0.74R",
    taken: 60,
    lead: true,
  },
  {
    name: "Asian range fade",
    winRate: 41.2,
    expectancy: "−0.18R",
    taken: 34,
    lead: false,
  },
];

function PlaybookComparison() {
  return (
    <div className="mt-7 flex flex-col gap-5">
      {PLAYBOOKS.map((play) => (
        <div key={play.name}>
          <div className="flex items-baseline justify-between gap-3">
            <p
              className={cn(
                "truncate text-[13.5px] font-medium tracking-tight",
                play.lead ? "text-fg" : "text-fg-muted",
              )}
            >
              {play.name}
            </p>
            <p
              className={cn(
                "stat shrink-0 text-[15px]",
                play.lead ? "text-positive" : "text-fg-subtle",
              )}
            >
              {play.expectancy}
            </p>
          </div>

          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
            <div
              className={cn(
                "h-full rounded-full",
                play.lead
                  ? "bg-accent shadow-[0_0_14px_-2px_var(--accent)]"
                  : "bg-fg-subtle/45",
              )}
              style={{ width: `${play.winRate}%` }}
            />
          </div>

          <p className="mt-2 text-[12px] text-fg-subtle">
            <span className="numeric">{play.winRate}%</span> win rate over{" "}
            <span className="numeric">{play.taken}</span> setups
          </p>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const MISTAKES = [
  { label: "Entered before the trigger", share: 72, cost: "−3.1R" },
  { label: "Moved the stop", share: 48, cost: "−1.9R" },
  { label: "Added after it went against me", share: 31, cost: "−1.2R" },
  { label: "Took the setup as written", share: 86, cost: "+5.4R", good: true },
];

function MistakeLadder() {
  return (
    <ul className="mt-7 flex flex-col gap-4">
      {MISTAKES.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[13px] text-fg-muted">
              {item.label}
            </p>
            <p
              className={cn(
                "stat shrink-0 text-[13.5px]",
                item.good ? "text-positive" : "text-negative",
              )}
            >
              {item.cost}
            </p>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.07]">
            <div
              className={cn(
                "h-full rounded-full",
                item.good ? "bg-positive" : "bg-negative/70",
              )}
              style={{ width: `${item.share}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */

const TAGS = ["liquidity sweep", "15m FVG", "London", "A+ setup", "news day"];

function TaggedRecord() {
  return (
    <div className="mt-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {TAGS.map((tag, index) => (
          <span
            key={tag}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] tracking-tight",
              index === 0
                ? "bg-accent-soft text-accent"
                : "bg-black/[0.04] text-fg-muted dark:bg-white/[0.06]",
            )}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* The screenshot, as a stack: the record and the two before it. */}
      <div className="relative ml-auto h-[4.5rem] w-32 shrink-0">
        <div className="absolute inset-y-1 left-3 right-0 rounded-lg border border-border bg-surface opacity-50" />
        <div className="absolute inset-y-0.5 left-1.5 right-1.5 rounded-lg border border-border bg-surface opacity-80" />
        <div className="absolute inset-0 right-3 overflow-hidden rounded-lg border border-border bg-surface shadow-[0_8px_20px_-10px_rgb(0_0_0/0.4)]">
          <svg
            viewBox="0 0 110 72"
            width="110"
            height="72"
            className="block h-full w-full"
            aria-hidden="true"
          >
            {[14, 26, 38, 50, 62, 74, 86].map((x, i) => {
              const bull = i % 3 !== 1;
              const top = 20 + ((i * 7) % 22);
              return (
                <g key={x}>
                  <line
                    x1={x}
                    x2={x}
                    y1={top - 7}
                    y2={top + 26}
                    className={bull ? "stroke-positive" : "stroke-negative"}
                    strokeWidth="1.5"
                  />
                  <rect
                    x={x - 3}
                    y={top}
                    width="6"
                    height="16"
                    rx="1"
                    className={bull ? "fill-positive" : "fill-negative"}
                  />
                </g>
              );
            })}
            <line
              x1="0"
              x2="110"
              y1="30"
              y2="30"
              className="stroke-accent"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function Features() {
  return (
    <Section id="features" className="border-t border-border">
      <SectionHeading
        title="Know which plays deserve your size"
        description="Most journals hand you a wall of statistics and leave the thinking to you. These four screens answer the questions you actually ask on a Sunday evening."
      />

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {/* Strategy A/B — the answer to a cluttered evaluator */}
        <RevealOnScroll className="min-w-0 sm:col-span-2">
          <Cell>
            <CellTitle>Two playbooks, one screen</CellTitle>
            <CellBody>
              Put a strategy next to another and read the difference in
              expectancy, not in a table you have to decode.
            </CellBody>
            <PlaybookComparison />
          </Cell>
        </RevealOnScroll>

        {/* Emotional and mistake tracking */}
        <RevealOnScroll delay={0.06} className="min-w-0 sm:col-span-2">
          <Cell>
            <CellTitle>What the mistakes actually cost</CellTitle>
            <CellBody>
              Tag the moment you broke your own rule. Over a few dozen trades
              the pattern stops being a feeling and becomes a number.
            </CellBody>
            <MistakeLadder />
          </Cell>
        </RevealOnScroll>

        {/* Tagging + screenshots */}
        <RevealOnScroll delay={0.12} className="min-w-0 sm:col-span-2">
          <Cell>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Camera className="size-4" strokeWidth={1.7} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <CellTitle>The chart stays with the trade</CellTitle>
                <CellBody>
                  Your own vocabulary, attached to the screenshot you were
                  looking at when you took it.
                </CellBody>
              </div>
            </div>
            <TaggedRecord />
          </Cell>
        </RevealOnScroll>

        {/* Setup score */}
        <RevealOnScroll delay={0.18} className="min-w-0">
          <Cell>
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ShieldCheck className="size-4" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <p className="stat mt-6 text-[2.75rem] leading-none text-fg">
              {EXAMPLE_SCORE.score}
              <span className="text-[1.25rem] text-fg-subtle">
                /{MAX_SCORE}
              </span>
            </p>
            <p className="mt-3 text-[14px] font-medium tracking-tight text-fg">
              Setup score, before the outcome
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              It scores how completely you recorded the setup and whether the
              levels cohere — not where the market is going next. A good setup
              is allowed to lose.
            </p>
          </Cell>
        </RevealOnScroll>

        {/* Filtering + privacy, the two quiet cells */}
        <RevealOnScroll delay={0.24} className="min-w-0">
          <Cell>
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Filter className="size-4" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <p className="mt-6 text-[14px] font-medium tracking-tight text-fg">
              Query your own history
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
              Market, direction, session, result, risk-to-reward — combined, in
              one search, with the answer in the URL you can send yourself.
            </p>
            <p className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-[12.5px] text-fg-subtle">
              <Lock className="size-3.5 shrink-0" strokeWidth={1.7} aria-hidden="true" />
              Row Level Security: the database refuses to hand your rows to
              anyone else.
            </p>
          </Cell>
        </RevealOnScroll>
      </div>
    </Section>
  );
}
