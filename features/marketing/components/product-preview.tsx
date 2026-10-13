import { Search, Star, TrendingUp, Activity, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { Reveal } from "@/features/marketing/components/reveal";

// ============================================================================
// MINI-CHART SVGs (Crisp, vector-based, uses exact theme colors)
// ============================================================================

const ChartOne = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full bg-surface-raised/50" preserveAspectRatio="none">
    <line x1="0" y1="45" x2="64" y2="45" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border-strong/50" />
    {/* Down candle */}
    <line x1="16" y1="20" x2="16" y2="45" stroke="var(--negative)" strokeWidth="1.5" />
    <rect x="13" y="25" width="6" height="15" rx="1" className="fill-negative" />
    {/* Sweep candle (Pin bar) */}
    <line x1="32" y1="35" x2="32" y2="58" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="29" y="35" width="6" height="10" rx="1" className="fill-positive" />
    {/* Breakout candle */}
    <line x1="48" y1="10" x2="48" y2="40" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="45" y="15" width="6" height="20" rx="1" className="fill-positive" />
  </svg>
);

const ChartTwo = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full bg-surface-raised/50" preserveAspectRatio="none">
    <line x1="0" y1="20" x2="64" y2="20" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-border-strong/50" />
    {/* Up candle */}
    <line x1="16" y1="15" x2="16" y2="40" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="13" y="25" width="6" height="10" rx="1" className="fill-positive" />
    {/* Failed breakout (Wick above resistance) */}
    <line x1="32" y1="8" x2="32" y2="30" stroke="var(--negative)" strokeWidth="1.5" />
    <rect x="29" y="20" width="6" height="10" rx="1" className="fill-negative" />
    {/* Drop candle */}
    <line x1="48" y1="25" x2="48" y2="55" stroke="var(--negative)" strokeWidth="1.5" />
    <rect x="45" y="28" width="6" height="22" rx="1" className="fill-negative" />
  </svg>
);

const ChartThree = () => (
  <svg viewBox="0 0 64 64" className="w-full h-full bg-surface-raised/50" preserveAspectRatio="none">
    {/* Moving Average Line */}
    <path d="M 0 55 C 20 50, 40 30, 64 15" fill="none" stroke="var(--accent)" strokeWidth="1.5" className="opacity-40" />
    {/* Momentum up 1 */}
    <line x1="16" y1="35" x2="16" y2="55" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="13" y="40" width="6" height="12" rx="1" className="fill-positive" />
    {/* Momentum up 2 */}
    <line x1="32" y1="20" x2="32" y2="45" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="29" y="25" width="6" height="15" rx="1" className="fill-positive" />
    {/* Momentum up 3 */}
    <line x1="48" y1="5" x2="48" y2="28" stroke="var(--positive)" strokeWidth="1.5" />
    <rect x="45" y="8" width="6" height="18" rx="1" className="fill-positive" />
  </svg>
);

// ============================================================================

const SAMPLE = [
  { 
    title: "London sweep into daily FVG", 
    ticker: "EURUSD", 
    long: true, 
    rr: "3.20R", 
    result: "Win", 
    strategy: "Liquidity sweep", 
    starred: true,
    Chart: ChartOne
  },
  { 
    title: "Failed breakout, prior week high", 
    ticker: "BTCUSD", 
    long: false, 
    rr: "2.10R", 
    result: "Loss", 
    strategy: "Range fade", 
    starred: false,
    Chart: ChartTwo
  },
  { 
    title: "Opening drive continuation", 
    ticker: "NAS100", 
    long: true, 
    rr: "4.00R", 
    result: "Win", 
    strategy: "Momentum", 
    starred: true,
    Chart: ChartThree
  },
];

const NAV = ["Dashboard", "My Setups", "Favorites", "Analytics"];

export function ProductPreview() {
  return (
    <section className="relative mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8 mt-12">
      
      {/* Floating Card: Setup Score */}
      <Reveal delay={0.4} className="absolute -top-6 -left-4 sm:-left-12 z-20 hidden md:block">
        <div className="glass backdrop-blur-xl flex items-center gap-3 rounded-xl px-4 py-3 shadow-floating">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Activity className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-fg-subtle">Setup Score</p>
            <p className="stat text-xl text-fg">87<span className="text-sm text-fg-muted">/100</span></p>
          </div>
        </div>
      </Reveal>

      {/* Floating Card: Weekly Stats */}
      <Reveal delay={0.5} className="absolute -bottom-8 -right-4 sm:-right-8 z-20 hidden md:block">
        <div className="glass backdrop-blur-xl flex items-center gap-3 rounded-xl px-4 py-3 shadow-floating">
          <div className="flex size-10 items-center justify-center rounded-full bg-positive-soft text-positive">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-fg-subtle">This Week</p>
            <p className="text-sm font-medium text-fg"><span className="stat">12</span> Setups Logged</p>
          </div>
        </div>
      </Reveal>

      {/* Floating Card: RR */}
      <Reveal delay={0.6} className="absolute top-1/2 -right-4 sm:-right-10 z-20 hidden lg:block transform -translate-y-1/2">
        <div className="glass backdrop-blur-xl flex flex-col gap-1 rounded-xl px-4 py-3 shadow-floating">
          <p className="text-[11px] font-medium text-fg-subtle">Avg RR</p>
          <div className="flex items-center gap-1.5 text-positive">
            <TrendingUp className="size-4" />
            <p className="stat text-lg">1:3.2</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.3}>
        <div className="glass backdrop-blur-xl overflow-hidden rounded-[1.25rem] border border-border shadow-elevated transition-transform hover:scale-[1.01] duration-700">
          <div className="grid grid-cols-1 bg-surface md:grid-cols-[200px_minmax(0,1fr)]">
            
            {/* Sidebar chrome */}
            <div className="hidden flex-col gap-1 border-r border-border bg-canvas-subtle/40 p-4 md:flex">
              <div className="mb-6 flex items-center gap-2.5 px-2">
                <LogoMark className="size-6 text-accent" />
                <span className="text-sm font-semibold text-fg tracking-tight">
                  SetupVault
                </span>
              </div>
              {NAV.map((item, index) => (
                <span
                  key={item}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors cursor-default",
                    index === 1
                      ? "bg-surface text-accent shadow-sm ring-1 ring-border-strong/50"
                      : "text-fg-subtle hover:text-fg hover:bg-surface-hover",
                  )}
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="min-w-0 grid-surface">
              {/* Top bar */}
              <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/50 px-5 py-4 backdrop-blur-md">
                <div className="flex h-9 w-64 items-center gap-2.5 rounded-md border border-border bg-surface-raised px-3 text-[13px] text-fg-muted shadow-sm transition-colors hover:border-border-strong">
                  <Search className="size-4" aria-hidden="true" />
                  Search setups...
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <span className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-accent-fg shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer">
                    New Setup
                  </span>
                </div>
              </div>

              {/* Setup rows with CLEAR VECTOR CHARTS */}
              <div className="divide-y divide-border bg-surface/40">
                {SAMPLE.map((setup) => {
                  const ChartIcon = setup.Chart;
                  return (
                    <div
                      key={setup.title}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-hover/60 cursor-pointer group"
                    >
                      {/* Vector Chart Thumbnail */}
                      <div className="relative flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-surface shadow-sm overflow-hidden group-hover:shadow-md transition-all duration-300">
                        <div className="w-full h-full transition-transform duration-500 group-hover:scale-110">
                          <ChartIcon />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg group-hover:text-accent transition-colors">
                          {setup.title}
                        </p>
                        <p className="mt-1 flex items-center gap-2.5 text-[13px] text-fg-subtle">
                          <span className="numeric font-medium text-fg-muted rounded bg-border/40 px-1.5 py-0.5">
                            {setup.ticker}
                          </span>
                          <span
                            className={cn("font-medium", setup.long ? "text-positive" : "text-negative")}
                          >
                            {setup.long ? "Long" : "Short"}
                          </span>
                          <span className="hidden sm:inline before:content-['•'] before:mr-2.5 before:text-border-strong">
                            {setup.strategy}
                          </span>
                        </p>
                      </div>

                      <span className="numeric hidden text-sm font-medium text-fg-muted sm:block">
                        {setup.rr}
                      </span>
                      <Star
                        className={cn(
                          "size-4 shrink-0 mx-2",
                          setup.starred
                            ? "fill-accent text-accent"
                            : "text-border-strong group-hover:text-fg-subtle transition-colors",
                        )}
                        aria-hidden="true"
                      />
                      <span
                        className={cn(
                          "shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold shadow-sm",
                          setup.result === "Win"
                            ? "bg-positive-soft text-positive border border-positive/20"
                            : "bg-negative-soft text-negative border border-negative/20",
                        )}
                      >
                        {setup.result}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}