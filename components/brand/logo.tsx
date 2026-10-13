import { cn } from "@/lib/utils";

/**
 * The mark features three minimalist candlesticks forming an uptrend.
 * It immediately communicates "trading" while maintaining a premium, 
 * unified SaaS look by using the brand's accent color.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-7 drop-shadow-sm", className)}
    >
      {/* Candle 1 (Base / Support) */}
      <line x1="6" y1="16" x2="6" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/40" />
      <rect x="3" y="19" width="6" height="7" rx="1.5" className="fill-accent/40" />

      {/* Candle 2 (Continuation) */}
      <line x1="16" y1="10" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent/70" />
      <rect x="13" y="13" width="6" height="6" rx="1.5" className="fill-accent/70" />

      {/* Candle 3 (Bullish Breakout) */}
      <line x1="26" y1="4" x2="26" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent" />
      <rect x="23" y="7" width="6" height="9" rx="1.5" className="fill-accent" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-[17px] font-bold tracking-tight text-fg">
          Setup<span className="text-accent">Vault</span>
        </span>
      ) : null}
    </span>
  );
}