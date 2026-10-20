import { Search, Star } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { PRIMARY_NAV } from "@/lib/navigation";
import { calculateRiskReward, formatRatio } from "@/lib/risk-reward";
import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import { ScoreBadge } from "@/features/setup-score/components/score-badge";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import type { TradeDirection, TradeResult } from "@/types/database";

/**
 * The library, shown with the product's own code.
 *
 * This section used to be a hand-drawn imitation of the app: its own badge
 * markup, its own nav labels typed out as strings, its own Setup Score of 87
 * while the bento below it said 88, and three glass cards floating at three
 * unrelated corners. Two different numbers for the same feature on one page is
 * the sort of detail a careful reader notices, and once they notice it they
 * stop believing any of the others.
 *
 * So nothing here is drawn twice. The sidebar is `PRIMARY_NAV`, the same array
 * the real sidebar renders. The direction, result and score chips are the
 * product's own components. The ratio comes from `calculateRiskReward` and the
 * score from `calculateSetupScore`, both fed the levels below — so the figures
 * on the marketing page are computed by the engine that computes them in the
 * app, and the page cannot claim a score the product would not give.
 *
 * The rows deliberately mirror `SetupRow`: 16:9 thumbnail, title, ticker and
 * direction and strategy beneath it, then fixed right-hand columns so the
 * numbers line up down the list. What a visitor sees here is the screen they
 * get.
 *
 * It is static by design — no hover states, no cursor-pointer, nothing that
 * invites a click it cannot answer.
 */

/* -------------------------------------------------------------------------- */
/* Thumbnails                                                                 */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Three records, with every figure derived from their own levels             */
/* -------------------------------------------------------------------------- */

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
    // This one scores what a thin record deserves.
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

  return {
    ratio: formatRatio(geometry.ok ? geometry.ratio : null),
    score,
  };
}

/* -------------------------------------------------------------------------- */

export function ProductPreview() {
  return (
    <section className="relative mx-auto mt-12 w-full max-w-5xl px-5 pb-24 sm:px-8">
      <Reveal delay={0.3}>
        <div className="glass overflow-hidden rounded-[1.25rem] border border-border shadow-elevated backdrop-blur-xl">
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
            </div>

            <div className="grid-surface min-w-0">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/50 px-4 py-3.5 sm:px-5">
                <div className="flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-md border border-border bg-surface-raised px-3 text-[13px] text-fg-subtle sm:max-w-64">
                  <Search className="size-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">Search your setups</span>
                </div>
                <span className="shrink-0 rounded-md bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-fg sm:px-4">
                  New setup
                </span>
              </div>

              {/* Rows, mirroring SetupRow's columns exactly. */}
              <div className="divide-y divide-border bg-surface/40">
                {SAMPLES.map((sample) => {
                  const { ratio, score } = derive(sample);
                  const Thumb = sample.Thumb;

                  return (
                    <div
                      key={sample.title}
                      className="flex items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5"
                    >
                      <div className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md border border-border bg-canvas-subtle sm:w-20">
                        <Thumb />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">
                          {sample.title}
                        </p>
                        <p className="mt-1 flex items-center gap-2 truncate text-xs text-fg-subtle">
                          <span className="numeric shrink-0 text-fg-muted">
                            {sample.ticker}
                          </span>
                          <DirectionBadge
                            direction={sample.direction}
                            variant="text"
                          />
                          <span className="truncate">{sample.strategy}</span>
                        </p>
                      </div>

                      <span className="numeric w-12 shrink-0 text-right text-xs text-fg-muted sm:w-14">
                        {ratio ?? "—"}
                      </span>

                      <Star
                        className={cn(
                          "hidden size-4 shrink-0 sm:block",
                          sample.starred
                            ? "fill-accent text-accent"
                            : "text-border-strong",
                        )}
                        aria-hidden="true"
                      />

                      <span className="flex shrink-0 items-center gap-2">
                        {score.scorable ? (
                          <ScoreBadge
                            score={score.score}
                            grade={score.grade}
                            className="hidden sm:inline-flex"
                          />
                        ) : null}
                        <ResultBadge result={sample.result} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Said plainly, because the alternative is letting a visitor assume
          these are somebody's real trades. */}
      <Reveal delay={0.4}>
        <p className="mx-auto mt-5 max-w-xl text-center text-[13px] leading-relaxed text-fg-subtle">
          The library at scanning density, with sample records. Every ratio and
          score above is computed by the same engine the app runs.
        </p>
      </Reveal>
    </section>
  );
}
