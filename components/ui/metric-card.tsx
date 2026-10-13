import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  /** Pass an em dash when there is genuinely nothing to show. */
  value: string;
  note?: string;
  tone?: "default" | "positive" | "negative" | "accent";
  className?: string;
  /** When present the figure counts up to its real value on first view. */
  count?: { value: number; decimals?: number; prefix?: string; suffix?: string };
}

const TONE_CLASS = {
  default: "text-fg",
  positive: "text-positive",
  negative: "text-negative",
  accent: "text-accent",
} as const;

/**
 * One figure, one label, one line of context. Used for every headline number
 * in the product so they share weight, spacing and alignment.
 */
export function MetricCard({
  label,
  value,
  note,
  tone = "default",
  className,
  count,
}: MetricCardProps) {
  const empty = value === "—";

  return (
    <Card glass className={cn("p-4 sm:p-5", className)}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "stat mt-3 text-[1.75rem] leading-none sm:text-[2rem]",
          empty ? "text-fg-subtle" : TONE_CLASS[tone],
        )}
      >
        {count ? <CountUp {...count} /> : value}
      </p>
      {note ? (
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">{note}</p>
      ) : null}
    </Card>
  );
}
