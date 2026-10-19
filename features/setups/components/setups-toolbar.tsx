"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpDown,
  Check,
  LayoutGrid,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { scaleItem } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  DATE_RANGE_OPTIONS,
  DEFAULT_FILTERS,
  RR_OPTIONS,
  SORT_OPTIONS,
  activeChips,
  filtersHref,
  hasActiveFilters,
  type SetupFilters,
} from "@/features/setups/filters";
import { MARKET_LABELS, RESULT_OPTIONS } from "@/features/setups/constants";
import type { MarketType } from "@/types/database";

interface ToolbarProps {
  filters: SetupFilters;
  facets: { markets: MarketType[]; strategies: string[] };
  /** Where filter changes navigate to. Lets /analytics reuse this toolbar. */
  pathname?: string;
  /** Sorting is meaningless on an aggregate view. */
  showSort?: boolean;
  /** Off where there is no library grid to apply it to. */
  showDensity?: boolean;
}

const DIRECTION_CHOICES = [
  { value: "all", label: "All" },
  { value: "long", label: "Long" },
  { value: "short", label: "Short" },
] as const;

const FAVORITE_CHOICES = [
  { value: "all", label: "All setups" },
  { value: "only", label: "Favourites only" },
] as const;

/** Small segmented control used for the two- and three-way filters. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border bg-surface-raised text-fg-muted hover:bg-surface-hover hover:text-fg",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Cards or rows.
 *
 * A segmented control rather than a dropdown: there are two options, both fit
 * on screen, and the current one should be visible without opening anything.
 * Only the background moves — the icons never shift — so switching reads as
 * the same control changing state rather than two controls swapping places.
 */
function DensityToggle({
  value,
  onChange,
}: {
  value: SetupFilters["view"];
  onChange: (view: SetupFilters["view"]) => void;
}) {
  const options = [
    { key: "cards" as const, icon: LayoutGrid, label: "Card view" },
    { key: "rows" as const, icon: Rows3, label: "List view" },
  ];

  return (
    <div
      role="group"
      aria-label="Library density"
      className="flex items-center gap-0.5 rounded-lg border border-border-strong bg-surface-raised p-0.5"
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={active}
            title={option.label}
            onClick={() => onChange(option.key)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-md",
              "transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
              "active:scale-[0.94]",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              active
                ? "bg-surface text-fg shadow-[0_1px_2px_rgb(0_0_0/0.25)]"
                : "text-fg-subtle [@media(hover:hover)and(pointer:fine)]:hover:text-fg",
            )}
          >
            <option.icon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SetupsToolbar({
  filters,
  facets,
  pathname = "/setups",
  showSort = true,
  showDensity = true,
}: ToolbarProps) {
  const router = useRouter();

  const [term, setTerm] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SetupFilters>(filters);

  const apply = (next: SetupFilters) => {
    // Any change to the result set returns to the first page.
    router.push(filtersHref({ ...next, page: 1 }, pathname));
  };

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    if (term === filters.q) return;

    const timer = setTimeout(() => {
      router.push(filtersHref({ ...filters, q: term, page: 1 }, pathname));
    }, 350);

    return () => clearTimeout(timer);
  }, [term, filters, router, pathname]);

  const chips = activeChips(filters, MARKET_LABELS);
  const active = hasActiveFilters(filters);
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ??
    "Newest first";

  const clearChip = (key: keyof SetupFilters) => {
    const next: SetupFilters = { ...filters, [key]: DEFAULT_FILTERS[key] };
    if (key === "range") {
      next.from = null;
      next.to = null;
    }
    if (key === "q") setTerm("");
    apply(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="glass backdrop-blur-xl flex flex-col gap-2 rounded-xl p-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={term}
            aria-label="Search setups"
            placeholder="Search title, ticker, strategy, tags or notes"
            className="border-transparent bg-transparent pl-9"
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setDraft(filters);
              setOpen(true);
            }}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filters
            {chips.length > 0 ? (
              <span className="numeric ml-0.5 rounded-full bg-accent px-1.5 text-xs text-accent-fg">
                {chips.length}
              </span>
            ) : null}
          </Button>

          {showSort ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="secondary" size="sm">
                <ArrowUpDown aria-hidden="true" />
                <span className="hidden sm:inline">{sortLabel}</span>
                <span className="sm:hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() =>
                    router.push(filtersHref({ ...filters, sort: option.value, page: 1 }, pathname))
                  }
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      filters.sort === option.value ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          ) : null}

          {showDensity ? (
            <DensityToggle
              value={filters.view}
              onChange={(view) =>
                router.push(filtersHref({ ...filters, view }, pathname))
              }
            />
          ) : null}
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <AnimatePresence initial={false} mode="popLayout">
            {chips.map((chip) => (
              <motion.button
                key={chip.key}
                layout
                variants={scaleItem}
                initial="hidden"
                animate="visible"
                exit="exit"
                type="button"
                onClick={() => clearChip(chip.key)}
                aria-label={`Remove filter ${chip.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/35 bg-accent-soft py-1 pl-3 pr-2 text-xs text-accent transition-colors hover:border-accent/60"
              >
                {chip.label}
                <X className="size-3" aria-hidden="true" />
              </motion.button>
            ))}
          </AnimatePresence>

          {active ? (
            <button
              type="button"
              onClick={() => {
                setTerm("");
                router.push(filtersHref({ ...DEFAULT_FILTERS, sort: filters.sort }, pathname));
              }}
              className="rounded-full px-2.5 py-1 text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter your library</DialogTitle>
            <DialogDescription>
              Every condition applies at once. Dates match when the trade was
              taken.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <Segmented
              label="Direction"
              value={draft.direction}
              options={DIRECTION_CHOICES}
              onChange={(value) => setDraft({ ...draft, direction: value })}
            />

            <Segmented
              label="Result"
              value={draft.result}
              options={[
                { value: "all", label: "All" },
                ...RESULT_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                })),
              ]}
              onChange={(value) => setDraft({ ...draft, result: value })}
            />

            <Segmented
              label="Favourites"
              value={draft.favorites}
              options={FAVORITE_CHOICES}
              onChange={(value) => setDraft({ ...draft, favorites: value })}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-market">Market</Label>
                <Select
                  id="filter-market"
                  value={draft.market}
                  onChange={(event) =>
                    setDraft({ ...draft, market: event.target.value })
                  }
                >
                  <option value="all">All markets</option>
                  {facets.markets.map((market) => (
                    <option key={market} value={market}>
                      {MARKET_LABELS[market] ?? market}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-strategy">Strategy</Label>
                <Select
                  id="filter-strategy"
                  value={draft.strategy}
                  onChange={(event) =>
                    setDraft({ ...draft, strategy: event.target.value })
                  }
                >
                  <option value="all">All strategies</option>
                  {facets.strategies.map((strategy) => (
                    <option key={strategy} value={strategy}>
                      {strategy}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-range">Trade date</Label>
                <Select
                  id="filter-range"
                  value={draft.range}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      range: event.target.value as SetupFilters["range"],
                    })
                  }
                >
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filter-rr">Risk to reward</Label>
                <Select
                  id="filter-rr"
                  value={draft.rr}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      rr: event.target.value as SetupFilters["rr"],
                    })
                  }
                >
                  {RR_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {draft.range === "custom" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-from">From</Label>
                  <Input
                    id="filter-from"
                    type="date"
                    value={draft.from ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, from: event.target.value || null })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="filter-to">To</Label>
                  <Input
                    id="filter-to"
                    type="date"
                    value={draft.to ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, to: event.target.value || null })
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDraft({ ...DEFAULT_FILTERS, q: draft.q, sort: draft.sort })}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => {
                setOpen(false);
                apply(draft);
              }}
            >
              Show results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
