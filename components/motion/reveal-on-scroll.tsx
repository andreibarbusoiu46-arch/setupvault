import { cn } from "@/lib/utils";

/**
 * Lifts a block into place as it scrolls into view, with a scroll-driven CSS
 * animation. No observer, no client bundle, and the content is present and
 * visible in the server-rendered HTML.
 */
export function RevealOnScroll({
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
      className={cn("sv-reveal-scroll", className)}
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
