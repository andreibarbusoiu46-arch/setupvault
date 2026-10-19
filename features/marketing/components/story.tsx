"use client";

import { motion } from "framer-motion";
import {
  BrainCircuit,
  Camera,
  Check,
  FolderTree,
  LineChart,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";
import { LEVELS, RISK_REWARD_LABEL, SESSION } from "@/features/marketing/data/nq-session";

/**
 * The product story, told in four isometric mockups.
 *
 * Each one is a real screen from the product, drawn at an angle so the page
 * reads as a stack of surfaces rather than a column of boxes. Two rules apply
 * inside every stage here, and both come from bugs that were real on iOS:
 *
 * 1. No backdrop-filter inside the tilted node. WebKit drops a layer that
 *    carries one inside a `preserve-3d` context, so the mockup vanishes
 *    instead of frosting. Everything inside a stage is opaque; the glass lives
 *    on the badges that float outside it.
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
        // Shorter on a phone: 450px of mostly-empty stage between sections is
        // the gap that reads as a broken layout. `overflow-visible` keeps the
        // tilted card able to spill past the stage; the width below is what
        // stops that spill reaching the document edge.
        "relative flex h-[250px] w-full items-center justify-center overflow-visible min-[400px]:h-[290px] sm:h-[520px]",
        className,
      )}
      style={{ WebkitPerspective: "1200px", perspective: "1200px" }}
    >
      <motion.div
        // Visible from the first paint: `opacity: 0` here would be
        // server-rendered inline and lift only once the script hydrates, which
        // is how these mockups end up as blank gaps on a slow device.
        initial={{ opacity: 1, rotateX: 24, rotateY: reverse ? -18 : 18 }}
        whileInView={{
          opacity: 1,
          rotateX: 14,
          rotateY: reverse ? -24 : 24,
          rotateZ: reverse ? 4 : -4,
        }}
        viewport={{ once: true, amount: 0.15, margin: "50px" }}
        transition={{ duration: 1.2, ease: ENTER }}
        className="relative w-full max-w-3xl origin-center scale-[0.8] min-[400px]:scale-[0.88] sm:w-[128%] sm:scale-100"
        style={STAGE_3D}
      >
        <motion.div
          // Below `sm` the mockup is scaled to 0.8, so 12px of travel arrives
          // as 9.6px over six seconds and reads as a still image. The yaw is
          // what sells it as a floating object rather than a sliding card; it
          // composes with the stage's own rotation above.
          animate={{ y: [0, -22, 0], rotateY: [0, -1.8, 0] }}
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
/* The section shell                                                          */
/* ========================================================================== */

function StorySection({
  id,
  icon: Icon,
  title,
  body,
  reverse = false,
  mockup,
  float,
}: {
  id?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
  reverse?: boolean;
  mockup: React.ReactNode;
  /** Glass that floats over the stage, outside its 3D context. */
  float?: React.ReactNode;
}) {
  return (
    <section id={id} className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 sm:gap-16 lg:grid-cols-2">
          <div className={cn(reverse && "lg:order-2")}>
            <Reveal>
              <span className="mb-6 flex size-11 items-center justify-center rounded-2xl border border-accent/10 bg-accent-soft text-accent">
                <Icon className="size-5" strokeWidth={1.7} />
              </span>
              <h2 className="display mb-5 text-[1.95rem] text-fg sm:text-[2.6rem]">
                {title}
              </h2>
              <p className="max-w-lg text-[16.5px] leading-relaxed text-fg-muted sm:text-[17.5px]">
                {body}
              </p>
            </Reveal>
          </div>

          <div className={cn("relative", reverse && "lg:order-1")}>
            <IsometricStage reverse={reverse}>{mockup}</IsometricStage>
            {/* On a phone the glass sits under the mockup. There is no room to
                float a card over a 335px-wide screen without covering the very
                rows it is commenting on; from `sm` up there is, and the cards
                position themselves against this wrapper. */}
            {float ? (
              <div className="mt-7 flex justify-center sm:mt-0 sm:block">{float}</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
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
    <Panel className="flex h-72 w-full sm:h-96">
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

export function Capture() {
  return (
    <StorySection
      id="capture"
      icon={Camera}
      title="Capture the moment, not the aftermath."
      body="Save the chart you were actually looking at, with your levels drawn on it and the thesis in your own words — while the trade is still open and you still remember why."
      reverse
      mockup={<CaptureMockup />}
      float={
        <FloatingCard className="w-full max-w-[20rem] sm:absolute sm:bottom-0 sm:left-2 sm:z-10 sm:w-[15rem]">
          <p className="text-[11.5px] font-semibold tracking-tight text-accent">
            Setup thesis
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-fg">
            Swept the Asian low, reclaimed it on the 15m. Entry on the retest,
            stop below the wick.
          </p>
        </FloatingCard>
      }
    />
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
          <FolderTree className="size-3.5 text-accent" strokeWidth={1.7} />
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

export function Organize() {
  return (
    <StorySection
      icon={FolderTree}
      title="One library, in your own vocabulary."
      body="Name a play once and reuse it. Tags, markets and sessions become the structure of the library, so finding the last twelve times you took this exact setup is one query, not an afternoon of scrolling."
      mockup={<OrganizeMockup />}
      float={
        <FloatingCard className="w-full max-w-[20rem] sm:absolute sm:right-2 sm:top-6 sm:z-10 sm:w-[12.5rem]">
          <p className="text-[11.5px] text-fg-subtle">Matching this setup</p>
          <p className="stat mt-1 text-[1.6rem] leading-none text-fg">12</p>
          <p className="mt-2 text-[12px] leading-snug text-fg-muted">
            taken since March, 9 of them winners
          </p>
        </FloatingCard>
      }
    />
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
          <p className="stat mt-1.5 text-[2.6rem] leading-none text-fg">68.4%</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-lg border border-positive/20 bg-positive-soft px-2.5 py-1.5 text-[12.5px] font-semibold text-positive">
          +4.2
        </span>
      </div>

      <div className="mt-8 flex h-28 items-end gap-2.5 sm:h-32">
        {SESSIONS.map((session) => (
          <div key={session.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className={cn(
                "w-full rounded-t-md",
                session.value > 70 ? "bg-accent" : "bg-accent-soft",
              )}
              style={{ height: `${session.value}%` }}
            />
            <span className="w-full truncate text-center text-[9.5px] text-fg-subtle">
              {session.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-3 gap-4 border-t border-black/[0.05] pt-5 dark:border-white/[0.06]">
        {[
          { label: "Expectancy", value: "+0.74R" },
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

export function Analyze() {
  return (
    <StorySection
      icon={LineChart}
      title="The numbers you would have worked out by hand."
      body="Expectancy by playbook, by session, by market. Not a wall of every statistic that exists — the few that change what you do on Monday."
      reverse
      mockup={<AnalyzeMockup />}
    />
  );
}

/* ========================================================================== */
/* 4 — AI review, the execution engine                                        */
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
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <BrainCircuit className="size-4" strokeWidth={1.7} />
        </span>
        <p className="text-[13px] font-semibold tracking-tight text-fg">
          Execution review
        </p>
        <span className="numeric ml-auto text-[10.5px] text-fg-subtle">
          {SESSION.label} · 16 Oct
        </span>
      </div>

      <div className="flex items-center gap-5 px-5 py-6">
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
            The exit cost you 1.1R against your own target. Everything before it
            was executed as written.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-black/[0.05] border-t border-black/[0.05] dark:divide-white/[0.06] dark:border-white/[0.06]">
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
    </Panel>
  );
}

export function AiReview() {
  return (
    <StorySection
      icon={BrainCircuit}
      title="A second read on how you executed."
      body="The model never sees your broker and never predicts a price. It reads the setup against the rules you wrote for yourself, and tells you the one thing that cost you the most — in plain language, with the evidence underneath it."
      mockup={<AiReviewMockup />}
      float={
        <FloatingCard className="w-full max-w-[20rem] sm:absolute sm:bottom-2 sm:right-2 sm:z-10 sm:w-[13rem]">
          <p className="text-[11.5px] text-fg-subtle">Costliest habit</p>
          <p className="mt-1.5 text-[13px] font-medium leading-snug text-fg">
            Exiting before your own target
          </p>
          <p className="stat mt-2 text-[1.1rem] text-negative">−8.4R</p>
          <p className="mt-1 text-[11.5px] text-fg-subtle">across 23 trades</p>
        </FloatingCard>
      }
    />
  );
}
