"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Link from "next/link";
import { Check, GitCompareArrows, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Picking two setups to compare.
 *
 * The selection is deliberately not in the URL. Filters are a view worth
 * sharing; "these two, for the next ten seconds" is a gesture, and putting it
 * in the address bar would mean a back button that steps through every tick
 * and untick. It lives here, and the thing worth keeping — the comparison
 * itself — gets its own addressable page.
 */

interface CompareState {
  selected: string[];
  toggle: (id: string, title: string) => void;
  clear: () => void;
  titles: Record<string, string>;
  isSelected: (id: string) => boolean;
  full: boolean;
}

const CompareContext = createContext<CompareState | null>(null);

export const MAX_COMPARE = 2;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});

  const toggle = useCallback((id: string, title: string) => {
    setTitles((current) => ({ ...current, [id]: title }));
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      // Past two, the oldest pick drops out rather than the click doing
      // nothing. A control that silently ignores you is worse than one that
      // shows you what it did.
      const next = [...current, id];
      return next.slice(-MAX_COMPARE);
    });
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  const value = useMemo<CompareState>(
    () => ({
      selected,
      toggle,
      clear,
      titles,
      isSelected: (id) => selected.includes(id),
      full: selected.length >= MAX_COMPARE,
    }),
    [selected, toggle, clear, titles],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("Compare controls must sit inside a CompareProvider.");
  }
  return context;
}

/**
 * The per-setup control. It sits outside the row's link, so choosing a setup
 * to compare never navigates away from the list you are choosing from.
 */
export function CompareToggle({
  setupId,
  title,
  className,
}: {
  setupId: string;
  title: string;
  className?: string;
}) {
  const { isSelected, toggle } = useCompare();
  const selected = isSelected(setupId);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Compare ${title}`}
      onClick={() => toggle(setupId, title)}
      // Sized and weighted like the star it sits opposite. The first version
      // was a bare 24px square on `bg-surface`, which on top of a dark chart
      // screenshot was invisible — and an affordance nobody can find does not
      // exist. It carries the same frosted plate the star does.
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg border",
        "transition-[background-color,border-color,transform,color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "active:scale-[0.92]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected
          ? "border-accent bg-accent text-accent-fg"
          : cn(
              "border-black/[0.08] bg-white/75 text-fg-subtle backdrop-blur-xl",
              "dark:border-white/[0.14] dark:bg-black/55",
              "[@media(hover:hover)and(pointer:fine)]:hover:border-accent/60",
              "[@media(hover:hover)and(pointer:fine)]:hover:text-fg",
            ),
        className,
      )}
    >
      <Check
        className={cn("size-3.5", selected ? "opacity-100" : "opacity-45")}
        strokeWidth={3}
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * The bar that appears once something is picked.
 *
 * Anchored to the bottom of the viewport rather than the page, because the
 * list it serves is scrolled while it is open. It only enters — there is no
 * exit animation — since dismissing it is immediate by design.
 */
/**
 * One line above the list saying what the ticks are for.
 *
 * It disappears the moment anything is picked: a hint that stays after you
 * have understood it is noise.
 */
export function CompareHint() {
  const { selected } = useCompare();
  if (selected.length > 0) return null;

  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs text-fg-subtle">
      <GitCompareArrows className="size-3.5 shrink-0" aria-hidden="true" />
      Tick two setups to put them side by side.
    </p>
  );
}

export function CompareBar() {
  const { selected, titles, clear, toggle } = useCompare();

  if (selected.length === 0) return null;

  const [a, b] = selected;
  const ready = selected.length === MAX_COMPARE;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex justify-center px-4",
        "pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "sv-compare-bar flex w-full max-w-xl items-center gap-3 rounded-2xl px-3 py-2.5",
          "border border-black/[0.08] bg-white/80 backdrop-blur-2xl",
          "dark:border-white/[0.10] dark:bg-[#0d1119]/85",
          "shadow-[0_1px_2px_rgb(0_0_0/0.2),0_16px_40px_-12px_rgb(0_0_0/0.45)]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selected.map((id) => (
            <span
              key={id}
              className="flex min-w-0 items-center gap-1 rounded-lg bg-surface-hover px-2 py-1 text-xs text-fg"
            >
              <span className="max-w-[9rem] truncate">{titles[id] ?? "Setup"}</span>
              <button
                type="button"
                aria-label={`Remove ${titles[id] ?? "setup"}`}
                onClick={() => toggle(id, titles[id] ?? "")}
                className="shrink-0 rounded text-fg-subtle transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}

          {!ready ? (
            <span className="hidden text-xs text-fg-subtle sm:inline">
              Pick one more
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>

          {ready ? (
            <Button asChild size="sm">
              <Link href={`${ROUTES.setups}/compare?a=${a}&b=${b}`}>
                <GitCompareArrows aria-hidden="true" />
                Compare
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled>
              <GitCompareArrows aria-hidden="true" />
              Compare
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
