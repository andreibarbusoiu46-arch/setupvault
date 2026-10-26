"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { Plus, Search, Sparkles, Star } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { PRIMARY_NAV } from "@/lib/navigation";
import { calculateRiskReward, formatRatio } from "@/lib/risk-reward";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { MAX_SCORE } from "@/features/setup-score/constants";
import type { TradeDirection, TradeResult } from "@/types/database";

/**
 * The library, building itself.
 *
 * This was a still picture of three saved setups. A still picture of a list
 * answers "what does it look like" and leaves "what do I actually do here"
 * unanswered — so the list now assembles itself: three skeleton rows, a
 * pointer that reaches for Add setup, and each record filling in the order a
 * person fills it. Thumbnail, then the words, then the star, then the result
 * once the trade is closed.
 *
 * Four rules hold it together.
 *
 * It is server-rendered finished. The initial state is the last frame of the
 * script, so the HTML contains the completed table and the page reads with
 * no JavaScript at all; the effect rewinds to the skeleton and plays only
 * once it is running on the client. Animating content in from nothing is how
 * this project has previously shipped blank panels to phones.
 *
 * It costs no frames. The script is a list of discrete beats advanced by one
 * timeout at a time — about twenty state updates across a ten-second loop,
 * not sixty a second. Everything between beats is interpolated by the
 * compositor.
 *
 * Reduced motion gets the finished table and nothing else moving. Not a
 * faster loop: no loop.
 *
 * Every colour is a token. The brief suggested `bg-slate-900/40` and
 * `dark:text-white`, which are the two things that cannot be used here — a
 * fixed slate panel and fixed white type invert wrongly the moment the theme
 * does, and this page has already shipped that bug once.
 */

/* ── Thumbnails ──────────────────────────────────────────────────────────── */

function Sweep() {
  return (
    <svg viewBox="0 0 80 45" className="block size-full" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="30" x2="80" y2="30" strokeWidth="1" strokeDasharray="3 3" className="stroke-border-strong" />
      <line x1="20" y1="8" x2="20" y2="32" strokeWidth="1.4" className="stroke-negative" />
      <rect x="17" y="12" width="6" height="14" rx="1" className="fill-negative" />
      <line x1="40" y1="22" x2="40" y2="42" strokeWidth="1.4" className="stroke-positive" />
      <rect x="37" y="24" width="6" height="8" rx="1" className="fill-positive" />
      <line x1="60" y1="4" x2="60" y2="28" strokeWidth="1.4" className="stroke-positive" />
      <rect x="57" y="7" width="6" height="16" rx="1" className="fill-positive" />
    </svg>
  );
}

function FailedBreak() {
  return (
    <svg viewBox="0 0 80 45" className="block size-full" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="13" x2="80" y2="13" strokeWidth="1" strokeDasharray="3 3" className="stroke-border-strong" />
      <line x1="20" y1="11" x2="20" y2="30" strokeWidth="1.4" className="stroke-positive" />
      <rect x="17" y="17" width="6" height="9" rx="1" className="fill-positive" />
      <line x1="40" y1="4" x2="40" y2="24" strokeWidth="1.4" className="stroke-negative" />
      <rect x="37" y="14" width="6" height="8" rx="1" className="fill-negative" />
      <line x1="60" y1="18" x2="60" y2="41" strokeWidth="1.4" className="stroke-negative" />
      <rect x="57" y="20" width="6" height="17" rx="1" className="fill-negative" />
    </svg>
  );
}

function Drive() {
  return (
    <svg viewBox="0 0 80 45" className="block size-full" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 0 38 C 24 34, 50 20, 80 9" fill="none" strokeWidth="1.3" className="stroke-accent opacity-40" />
      <line x1="20" y1="24" x2="20" y2="40" strokeWidth="1.4" className="stroke-positive" />
      <rect x="17" y="28" width="6" height="9" rx="1" className="fill-positive" />
      <line x1="40" y1="14" x2="40" y2="32" strokeWidth="1.4" className="stroke-positive" />
      <rect x="37" y="17" width="6" height="11" rx="1" className="fill-positive" />
      <line x1="60" y1="3" x2="60" y2="20" strokeWidth="1.4" className="stroke-positive" />
      <rect x="57" y="5" width="6" height="13" rx="1" className="fill-positive" />
    </svg>
  );
}

/* ── The three records ───────────────────────────────────────────────────── */

interface Sample {
  title: string;
  ticker: string;
  direction: TradeDirection;
  strategy: string;
  result: TradeResult;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  tradedOn: string;
  tagCount: number;
  notesLength: number;
  starred: boolean;
  Thumb: () => React.ReactElement;
}

const SAMPLES: Sample[] = [
  {
    title: "London sweep into daily FVG",
    ticker: "EURUSD",
    direction: "long",
    strategy: "Liquidity sweep",
    result: "win",
    entry: 1.0842,
    stopLoss: 1.0818,
    takeProfit: 1.0918,
    tradedOn: "2026-10-14",
    tagCount: 2,
    notesLength: 15,
    starred: true,
    Thumb: Sweep,
  },
  {
    title: "Failed breakout, prior week high",
    ticker: "BTCUSD",
    direction: "short",
    strategy: "Range fade",
    result: "loss",
    entry: 71_400,
    stopLoss: 72_050,
    takeProfit: 70_620,
    tradedOn: "2026-10-13",
    // Logged in a hurry: no tags, nothing written down, and a target barely
    // more than a stop away. Three rows that all score A+ would say the score
    // does not discriminate, which is the opposite of the claim being made.
    tagCount: 0,
    notesLength: 0,
    starred: false,
    Thumb: FailedBreak,
  },
  {
    title: "Opening drive continuation",
    ticker: "NQ100",
    direction: "long",
    strategy: "Momentum",
    result: "win",
    entry: 29_995,
    stopLoss: 29_940,
    takeProfit: 30_225,
    tradedOn: "2026-10-16",
    tagCount: 5,
    notesLength: 340,
    starred: true,
    Thumb: Drive,
  },
];

/** The same pipeline a real row runs: levels in, ratio and score out. */
function derive(sample: Sample) {
  const geometry = calculateRiskReward({
    direction: sample.direction,
    entry: sample.entry,
    stopLoss: sample.stopLoss,
    takeProfit: sample.takeProfit,
  });
  const score = calculateSetupScore({
    direction: sample.direction,
    ticker: sample.ticker,
    market: "forex",
    tradedOn: sample.tradedOn,
    entry: sample.entry,
    stopLoss: sample.stopLoss,
    takeProfit: sample.takeProfit,
    strategy: sample.strategy,
    notesLength: sample.notesLength,
    hasScreenshot: true,
    tagCount: sample.tagCount,
  });
  return { ratio: formatRatio(geometry.ok ? geometry.ratio : null), score };
}

const ROWS = SAMPLES.map((sample) => ({ sample, ...derive(sample) }));

/* ── The script ──────────────────────────────────────────────────────────── */

/**
 * How far a given row has been filled.
 * 0 skeleton · 1 drafting · 2 chart · 3 details · 4 starred · 5 result in.
 */
type Fill = 0 | 1 | 2 | 3 | 4 | 5;

interface Beat {
  rows: [Fill, Fill, Fill];
  /** Where the pointer is, and whether it is mid-press. */
  cursor: "rest" | "button";
  pressed: boolean;
  ms: number;
}

const SCRIPT: Beat[] = (() => {
  const out: Beat[] = [];
  const rows: [Fill, Fill, Fill] = [0, 0, 0];
  const snap = (cursor: Beat["cursor"], pressed: boolean, ms: number) =>
    out.push({ rows: [...rows] as [Fill, Fill, Fill], cursor, pressed, ms });

  snap("rest", false, 1900); // the empty library, shimmering
  snap("button", false, 620); // the pointer reaches
  snap("button", true, 260); // and presses

  for (let i = 0; i < 3; i++) {
    for (let f = 1 as Fill; f <= 5; f = (f + 1) as Fill) {
      rows[i] = f;
      // The result lands a beat later than the rest: a trade is closed after
      // it is written down, not at the same moment.
      snap("rest", false, f === 5 ? 320 : 240);
    }
    snap("rest", false, 200);
  }

  snap("rest", false, 2800); // the finished library, held
  return out;
})();

const LAST = SCRIPT.length - 1;

/* ── Pieces ──────────────────────────────────────────────────────────────── */

const SOFT = { duration: 0.34, ease: EASE_OUT } as const;
/** Apple's parameterisation: easier to reason about than stiffness/damping. */
const POP = { type: "spring", duration: 0.42, bounce: 0.34 } as const;

function Shimmer({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn("block rounded-md bg-fg/[0.07]", className)}
      animate={{ opacity: [0.45, 0.8, 0.45] }}
      transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** The star, and the four sparks it throws when it fills. */
function Favourite({ on, show }: { on: boolean; show: boolean }) {
  return (
    <span className="relative hidden size-4 shrink-0 sm:block">
      {/* Centred with left/top and a negative margin rather than a translate,
          so x and y stay free for the throw. */}
      {show && on
        ? [0, 90, 180, 270].map((deg) => (
            <motion.span
              key={deg}
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 -ml-[1.5px] -mt-[1.5px] size-[3px] rounded-full bg-accent"
              initial={{ opacity: 0.9, scale: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 0.4,
                x: Math.cos((deg * Math.PI) / 180) * 13,
                y: Math.sin((deg * Math.PI) / 180) * 13,
              }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            />
          ))
        : null}

      <motion.span
        className="absolute inset-0"
        animate={show && on ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={POP}
      >
        <Star
          className={cn(
            "size-4 transition-colors duration-200",
            show && on ? "fill-accent text-accent" : "text-border-strong",
          )}
          aria-hidden="true"
        />
      </motion.span>
    </span>
  );
}

function Row({
  row,
  fill,
  index,
}: {
  row: (typeof ROWS)[number];
  fill: Fill;
  index: number;
}) {
  const { sample, ratio, score } = row;
  const Thumb = sample.Thumb;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5">
      {/* The thumbnail shares a layoutId with its own placeholder, so the
          empty slot does not fade out and a picture fade in — the one box
          becomes the other. */}
      <div className="relative aspect-video w-14 shrink-0 sm:w-20">
        {fill >= 2 ? (
          <motion.div
            layoutId={`pp-thumb-${index}`}
            className="absolute inset-0 overflow-hidden rounded-md border border-border bg-canvas-subtle"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            transition={POP}
          >
            <Thumb />
          </motion.div>
        ) : (
          <motion.div
            layoutId={`pp-thumb-${index}`}
            className="absolute inset-0 rounded-md border border-dashed border-border bg-fg/[0.04]"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {fill >= 3 ? (
          <motion.div
            initial={{ opacity: 0, transform: "translateX(-6px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            transition={SOFT}
          >
            <p className="truncate text-sm font-medium text-fg">{sample.title}</p>
            {/* A phone has room for three columns, not five. The ratio joins
                the meta line here and its own column steps out below `sm`;
                the strategy, which is the longest and least scannable of the
                three, is the one that goes. Nothing is invented for the
                narrow layout — it is the same fields, re-ranked. */}
            <motion.p
              className="mt-1 flex items-center gap-2 truncate text-xs text-fg-subtle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...SOFT, delay: 0.07 }}
            >
              <span className="numeric shrink-0 text-fg-muted">{sample.ticker}</span>
              <DirectionBadge direction={sample.direction} variant="text" />
              <span className="numeric shrink-0 text-fg-muted sm:hidden">
                {ratio ?? "—"}
              </span>
              <span className="hidden truncate sm:inline">{sample.strategy}</span>
            </motion.p>
          </motion.div>
        ) : fill >= 1 ? (
          <p className="truncate whitespace-nowrap text-sm text-fg-subtle">
            Drafting<span className="sv-ellipsis" aria-hidden="true" />
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Shimmer className="h-3 w-1/2" />
            <Shimmer className="h-2.5 w-1/3" />
          </div>
        )}
      </div>

      <span className="numeric hidden w-12 shrink-0 text-right text-xs text-fg-muted sm:block sm:w-14">
        {fill >= 3 ? (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={SOFT}>
            {ratio ?? "—"}
          </motion.span>
        ) : (
          <Shimmer className="ml-auto h-2.5 w-9" />
        )}
      </span>

      <Favourite on={sample.starred} show={fill >= 4} />

      <span className="flex shrink-0 items-center justify-end gap-2 sm:min-w-[6.5rem]">
        {fill >= 5 ? (
          <>
            {score.scorable ? (
              <motion.span
                className="hidden sm:inline-flex"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SOFT}
              >
                <span className="numeric inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-raised px-2 py-0.5 text-xs">
                  <span className="font-medium text-accent">{score.grade}</span>
                  <span className="text-fg-muted">{score.score}</span>
                </span>
              </motion.span>
            ) : null}
            <motion.span
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={POP}
            >
              <ResultBadge result={sample.result} />
            </motion.span>
          </>
        ) : fill >= 1 ? (
          <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-fg-subtle">
            Open
          </span>
        ) : (
          <Shimmer className="h-5 w-16 rounded-full" />
        )}
      </span>
    </div>
  );
}

/**
 * The payoff of the sequence: the score climbing as records complete.
 *
 * It appears twice, because it lived only in the sidebar and the sidebar is
 * hidden below `md` — so on the phone, where most of this page is read, the
 * one number the whole animation builds towards was invisible. Same
 * component, two placements: a card at the foot of the sidebar on a desktop,
 * a strip under the rows on a phone.
 */
function ScoreMeter({
  average,
  grade,
  className,
}: {
  average: number;
  grade: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10.5px] text-fg-subtle">Average setup score</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <motion.span
          key={average}
          className="stat text-[1.35rem] leading-none text-fg"
          initial={{ opacity: 0, transform: "translateY(4px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={SOFT}
        >
          {average || "—"}
        </motion.span>
        <span className="text-[11px] text-fg-subtle">/{MAX_SCORE}</span>
        <span className="ml-auto text-[11px] font-medium text-accent">{grade}</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.08]">
        <motion.div
          className="h-full rounded-full bg-accent"
          animate={{ width: `${average}%` }}
          transition={{ duration: 0.65, ease: EASE_OUT }}
        />
      </div>
    </div>
  );
}

/* ── The preview ─────────────────────────────────────────────────────────── */

export function ProductPreview() {
  const reduceMotion = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);

  // `useReducedMotion` reads matchMedia during the *first* client render, so
  // on a machine that asks for less motion it returns true immediately while
  // the server rendered false. Branching markup on it directly therefore
  // changes the tree between the server HTML and the first client render,
  // which is a hydration mismatch (React #418 — measured, not guessed).
  //
  // So nothing decorative is removed until after hydration. Server snapshot
  // false, client snapshot true: the same guard the theme toggle and the
  // mobile drawer already use, and no setState inside an effect.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const still = hydrated && reduceMotion;

  // Starts on the last beat, which does three things at once: the server
  // renders the finished library so the page reads with no JavaScript, the
  // first client render matches it exactly so there is nothing to rewind and
  // no hydration mismatch, and the loop's own wrap-around (LAST → 0) becomes
  // the reset. The viewer therefore sees the finished thing first and then
  // watches it being built, which is the right order: the hold answers "what
  // is this" before the build answers "what do I do".
  const [step, setStep] = useState(LAST);

  const beat = SCRIPT[step];
  const done = ROWS.filter((_, i) => beat.rows[i] >= 5);
  const average = done.length
    ? Math.round(done.reduce((sum, r) => sum + r.score.score, 0) / done.length)
    : 0;
  const grade = done.length ? done[done.length - 1].score.grade : "—";

  const replay = useCallback(() => setStep(0), []);

  useEffect(() => {
    // Reduced motion gets the finished library and no timer at all. Not a
    // faster loop — no loop.
    //
    // The guard is on `step === LAST` rather than on reduced motion alone,
    // which gives the behaviour for free in both directions: nothing runs at
    // rest, and if someone with reduced motion presses Watch it again, the
    // build plays through once and then stops at the end instead of looping.
    // A sequence the person asked for is not the thing the setting is about.
    if (reduceMotion && step === LAST) return;

    let timer = 0;
    let onScreen = true;
    let paused = false;

    const schedule = () => {
      timer = window.setTimeout(() => {
        setStep((s) => (s >= LAST ? 0 : s + 1));
      }, SCRIPT[step].ms);
    };

    // Starts immediately; the observer only ever pauses. Gating the start on
    // it is a race this project has already lost once — a first callback can
    // land before layout settles, report a miss, and leave the thing frozen
    // with nothing to wake it.
    schedule();

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.boundingClientRect.width === 0) return;
        onScreen = entry.isIntersecting;
        if (!onScreen || document.hidden) {
          paused = true;
          window.clearTimeout(timer);
        } else if (paused) {
          paused = false;
          schedule();
        }
      },
      { rootMargin: "80px" },
    );
    if (host.current) observer.observe(host.current);

    const onVisibility = () => {
      if (document.hidden) {
        paused = true;
        window.clearTimeout(timer);
      } else if (paused && onScreen) {
        paused = false;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [step, reduceMotion]);

  return (
    <section
      ref={host}
      className="relative mx-auto mt-12 w-full max-w-5xl px-5 pb-24 sm:px-8"
    >
      <LayoutGroup id="product-preview">
        <div className="glass-card relative overflow-hidden rounded-[1.25rem] backdrop-blur-xl">
          <div className="grid grid-cols-1 bg-surface md:grid-cols-[200px_minmax(0,1fr)]">
            {/* Sidebar chrome, from the array the real sidebar reads. */}
            <div className="hidden flex-col gap-0.5 border-r border-border bg-canvas-subtle/40 p-4 md:flex">
              <div className="mb-6 flex items-center gap-2.5 px-2">
                <LogoMark className="size-6 text-accent" />
                <span className="text-sm font-semibold tracking-tight text-fg">
                  SetupVault
                </span>
              </div>

              {PRIMARY_NAV.map((item, index) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px]",
                      index === 1 ? "bg-surface-hover text-fg" : "text-fg-muted",
                    )}
                  >
                    <Icon
                      className={cn("size-4 shrink-0", index === 1 && "text-accent")}
                      aria-hidden="true"
                    />
                    {item.label}
                  </span>
                );
              })}

              <ScoreMeter
                average={average}
                grade={grade}
                className="mt-auto rounded-xl border border-border bg-surface p-3"
              />
            </div>

            <div className="grid-surface relative min-w-0">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/50 px-4 py-3.5 sm:px-5">
                <div className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-border bg-surface-raised px-3 text-[13px] text-fg-subtle sm:max-w-64">
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Search your setups</span>
                </div>

                <motion.span
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2",
                    "text-[13px] font-semibold text-accent-fg sm:px-4",
                    "bg-accent",
                  )}
                  animate={{ scale: beat.pressed ? 0.97 : 1 }}
                  transition={{ duration: 0.16, ease: EASE_OUT }}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                  Add setup
                  {/* The ring the press throws off. */}
                  <AnimatePresence>
                    {beat.pressed ? (
                      <motion.span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-accent"
                        initial={{ opacity: 0.55, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.35 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT }}
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border bg-surface/40">
                {ROWS.map((row, index) => (
                  <Row key={row.sample.title} row={row} fill={beat.rows[index]} index={index} />
                ))}
              </div>

              {/* The same meter the sidebar carries, for the widths where
                  there is no sidebar. */}
              <ScoreMeter
                average={average}
                grade={grade}
                className="border-t border-border bg-surface px-4 py-3 md:hidden"
              />

              {/* The pointer. Hidden from reduced motion and from touch, where
                  a cursor is a thing that does not exist. */}
              {!still ? (
                <motion.span
                  aria-hidden="true"
                  // Anchored to the Add setup button's own corner, so both
                  // positions are pixel offsets from one point. A percentage
                  // would be no use here: translate percentages resolve
                  // against the element's own 16px box, not the panel.
                  //
                  // Animated as a full transform string rather than framer's
                  // x/y shorthand — the shorthand runs on the main thread,
                  // and this fires while three rows are also animating.
                  className="pointer-events-none absolute right-5 top-4 hidden drop-shadow-[0_2px_4px_rgb(0_0_0/0.45)] pointer-fine:block"
                  initial={false}
                  animate={{
                    transform:
                      beat.cursor === "button"
                        ? "translate(0px, 0px)"
                        : "translate(-124px, 148px)",
                    opacity: beat.cursor === "button" ? 1 : 0.5,
                  }}
                  transition={{ type: "spring", duration: 0.7, bounce: 0.18 }}
                >
                  <svg
                    viewBox="0 0 16 18"
                    className="size-4 fill-fg stroke-canvas"
                    strokeWidth="1.2"
                  >
                    <path d="M1 1 L1 14.5 L4.6 11.2 L7 16.8 L9.4 15.7 L7 10.2 L12 10.2 Z" />
                  </svg>
                </motion.span>
              ) : null}
            </div>
          </div>
        </div>
      </LayoutGroup>

      <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <p className="text-center text-[13px] leading-relaxed text-fg-subtle">
          The library at scanning density, with sample records. Every ratio and
          score is computed by the same engine the app runs.
        </p>
        {/* Kept in every case, reduced motion included: this is the one piece
            of motion here the person chose. 44px tall on a phone, which is
            the smallest a thumb hits reliably; a pill that size on a desktop
            would be oversized, so it tightens once there is a cursor. */}
        <button
          type="button"
          onClick={replay}
          className={cn(
            "glass-control inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4",
            "backdrop-blur-xl backdrop-saturate-150",
            "text-[12.5px] font-medium",
            "sm:min-h-0 sm:px-3 sm:py-1.5",
            "transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
            "active:scale-[0.97]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          Watch it again
        </button>
      </div>
    </section>
  );
}
