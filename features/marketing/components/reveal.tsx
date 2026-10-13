import { cn } from "@/lib/utils";

/**
 * The hero's staggered entrance.
 *
 * A server component with a CSS animation, not a motion component: the
 * markup arrives visible, so the page reads even if its JavaScript never
 * runs. The stagger travels as a custom property instead of a prop into a
 * client bundle.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("sv-reveal", className)}
      style={
        delay
          ? ({ "--sv-delay": `${delay * 1000}ms` } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
