import { Badge } from "@/components/ui/badge";
import { RESULT_BADGE, RESULT_LABELS } from "@/features/setups/constants";
import { ResultArrow } from "@/features/setups/components/result-arrow";
import { cn } from "@/lib/utils";
import type { TradeDirection, TradeResult } from "@/types/database";

/** Single source of truth for how a result is rendered anywhere in the app. */
export function ResultBadge({ result }: { result: TradeResult }) {
  return (
    <Badge variant={RESULT_BADGE[result]}>
      <ResultArrow result={result} />
      {RESULT_LABELS[result]}
    </Badge>
  );
}

export function DirectionBadge({
  direction,
  variant = "badge",
}: {
  direction: TradeDirection;
  variant?: "badge" | "text";
}) {
  const long = direction === "long";
  const label = long ? "Long" : "Short";

  if (variant === "text") {
    return (
      <span className={long ? "text-positive" : "text-negative"}>{label}</span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        long
          ? "border-positive/25 bg-positive-soft text-positive"
          : "border-negative/25 bg-negative-soft text-negative",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-0 border-x-4 border-x-transparent",
          long ? "border-b-4 border-b-positive" : "border-t-4 border-t-negative",
        )}
      />
      {label}
    </span>
  );
}
