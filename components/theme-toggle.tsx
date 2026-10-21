"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { useCallback, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/**
 * Theme switch.
 *
 * Hydration-safe twice over. `mounted` gates anything derived from the stored
 * theme — the server cannot know it, so rendering a state-dependent attribute
 * before hydration guarantees a mismatch (that was the real cause of the
 * production hydration error). And the icons themselves are driven by CSS off
 * the `.dark` class rather than by React state, so the correct one is painted
 * before React runs at all: the control is never blank and never flips.
 *
 * The palette cross-fade is a class added to <html> for the length of the
 * transition and removed after, so colours fade on a theme change only —
 * never on first paint, never on hover.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  const reduceMotion = useReducedMotion();

  // The same hydration guard as a `mounted` flag, without a setState inside an
  // effect — which this project's lint rules reject, and which costs an extra
  // cascading render. Server snapshot false, client snapshot true.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const toggle = useCallback(() => {
    // Read the class rather than React state: it is what is actually on
    // screen, and it is right even on the first click after load.
    //
    // Nothing else happens here. This used to add a `.theme-transition`
    // class to <html> to cross-fade the palette, and that class cost 1520ms
    // of blocked main thread on a throttled phone — the `*` selector
    // invalidated style for every node in the document. next-themes handles
    // the swap cleanly on its own; the fastest toggle is the one that only
    // changes custom properties.
    setTheme(
      document.documentElement.classList.contains("dark") ? "light" : "dark",
    );
  }, [setTheme]);

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      // Before hydration the stored theme is unknown, so the control stays
      // inert rather than claiming a state it cannot know.
      aria-disabled={mounted ? undefined : true}
      // Physical response: it compresses under the finger and springs back.
      whileTap={reduceMotion ? undefined : { scale: 0.92 }}
      whileHover={reduceMotion ? undefined : { scale: 1.04 }}
      transition={{ type: "spring", stiffness: 420, damping: 26, mass: 0.6 }}
      className={cn(
        // 44px on a phone, 40 once there is a pointer: the smallest target a
        // thumb hits reliably is larger than the smallest a cursor does.
        "group relative inline-flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full md:size-10",
        // Frosted crystal: a near-transparent fill, a hairline that catches
        // light at the top, and real blur from Tailwind's own utility — a
        // hand-written backdrop-filter is stripped by the build.
        "border border-black/[0.07] bg-black/[0.03] backdrop-blur-2xl",
        "dark:border-white/[0.07] dark:bg-white/[0.03]",
        "text-fg-muted shadow-[inset_0_1px_0_0_rgb(255_255_255/0.5)] dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)]",
        "transition-[color,border-color,background-color] duration-300",
        "hover:text-fg hover:border-black/[0.12] dark:hover:border-white/[0.14]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      {/* A faint bloom that only appears on hover, under the icon. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-accent/0 transition-colors duration-500 group-hover:bg-accent/[0.08]"
      />

      <Sun className="size-[18px] rotate-0 scale-100 opacity-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:size-[17px] dark:-rotate-90 dark:scale-0 dark:opacity-0" />
      <Moon className="absolute size-[18px] rotate-90 scale-0 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:size-[17px] dark:rotate-0 dark:scale-100 dark:opacity-100" />
    </motion.button>
  );
}

/* Drawn here rather than imported so the rays and the crescent can carry the
   same 1.6 stroke as the rest of the interface chrome. */

function Sun({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="2.6"
          x2="12"
          y2="5"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
    </svg>
  );
}

function Moon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.2 14.6A8.4 8.4 0 0 1 9.4 3.8a8.4 8.4 0 1 0 10.8 10.8Z" />
    </svg>
  );
}
