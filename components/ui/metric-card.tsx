import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  label: string;
  /** Pass an em dash when there is genuinely nothing to show. */
  value: string;
  note?: string;
  tone?: "default" | "positive" | "negative" | "accent";
  className?: string;
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
 *
 * The figure no longer counts up. A count-up is an animation on the one thing
 * the screen exists to show, on screens people open several times a day — it
 * delays the reading it is decorating. It belongs on a landing page seen once,
 * not on a dashboard.
 */
export function MetricCard({
  label,
  value,
  note,
  tone = "default",
  className,
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
        {value}
      </p>
      {note ? (
        <p className="mt-2 text-xs leading-relaxed text-fg-subtle">{note}</p>
      ) : null}
    </Card>
  );
}
