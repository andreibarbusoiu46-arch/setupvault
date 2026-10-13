import { cn } from "@/lib/utils";
import type { Grade } from "@/features/setup-score/constants";

/** Compact form for cards: grade plus number, no ring, no colour coding. */
export function ScoreBadge({
  score,
  grade,
  className,
}: {
  score: number;
  grade: Grade;
  className?: string;
}) {
  return (
    <span
      title={`Setup quality score ${score} of 100`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface-raised px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span className="font-medium text-accent">{grade}</span>
      <span className="numeric text-fg-muted">{score}</span>
      <span className="sr-only">setup quality score out of 100</span>
    </span>
  );
}
