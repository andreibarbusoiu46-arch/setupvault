import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { TIER_POLICIES } from "@/lib/feature-access";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "@/features/marketing/components/section";

/**
 * Pricing.
 *
 * The numbers come from `TIER_POLICIES`, which is also what the application
 * enforces at runtime. A pricing page that keeps its own copy of the limits
 * drifts from the product within a release or two, and then the site is
 * quietly lying about what you get.
 *
 * Billing is not built yet, and the page says so rather than showing a
 * checkout button that goes nowhere. The price is published because knowing
 * what it will cost is the thing people actually want from this section.
 */

const FREE = TIER_POLICIES.free;
const PRO = TIER_POLICIES.pro;

const PRO_PRICE = "€19";

/** Everything the library does, on any plan. The product, not the upsell. */
const LIBRARY = [
  "Unlimited setups, with the screenshot attached",
  "Strategies, tags, markets and sessions",
  "Search and filters across your whole history",
  "Analytics, trading calendar and setup score",
  "Your data stays yours, and exports whenever you want",
];

/** What the paid plan adds. Each one maps to a real feature flag. */
const PRO_ADDS = [
  "Auto-tagging — the model proposes the structures, you approve them",
  "Price levels read straight off the screenshot",
  "Pattern recognition across your own trading history",
  "Search your vault in plain language",
];

function Allowance({
  value,
  label,
  emphasis = false,
}: {
  value: number | null;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "stat text-[1.75rem] leading-none",
          emphasis ? "text-accent" : "text-fg",
        )}
      >
        {value === null ? "∞" : value}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-snug text-fg-subtle">{label}</p>
    </div>
  );
}

export function PricingPreview() {
  return (
    <Section id="pricing" className="border-t border-border">
      <SectionHeading
        title="One price, when there is something to charge for"
        description="The library itself is free and stays free. What costs money is the amount of model time you point at it."
      />

      <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-2">
        {/* ---------------------------------------------------------- Free */}
        <div className="glass flex flex-col rounded-2xl p-6 backdrop-blur-xl sm:p-8">
          <h3 className="text-[15px] font-medium tracking-tight text-fg">Free</h3>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
            <span className="stat text-[2.75rem] leading-none text-fg">€0</span>
            <span className="text-[13.5px] text-fg-subtle">forever</span>
          </p>

          <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
            The whole library, with enough model time to see whether the reviews
            tell you anything you did not already know.
          </p>

          <div className="mt-7 flex gap-8 border-y border-border py-5">
            <Allowance
              value={FREE.monthlyAnalyses}
              label="setup reviews a month"
            />
            <Allowance
              value={FREE.monthlyVisionAnalyses}
              label="chart reads a month"
            />
          </div>

          <ul className="mt-6 flex flex-col gap-3">
            {LIBRARY.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[13.5px] leading-snug text-fg-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-soft"
                >
                  <Check className="size-2.5 text-accent" strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-1 lg:mt-auto">
            <Button asChild size="lg" fullWidth variant="secondary">
              <Link href={ROUTES.signup}>Start free</Link>
            </Button>
          </div>
        </div>

        {/* ----------------------------------------------------------- Pro */}
        <div className="relative flex flex-col rounded-2xl border border-accent/25 bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
          {/* One hairline of light along the top edge, not a glow around the
              whole card. Depth, not neon. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
          />

          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-medium tracking-tight text-fg">Pro</h3>
            <span className="text-[12.5px] text-fg-subtle">billing opens soon</span>
          </div>

          <p className="mt-5 flex flex-wrap items-baseline gap-x-2">
            <span className="stat text-[2.75rem] leading-none text-fg">
              {PRO_PRICE}
            </span>
            <span className="text-[13.5px] text-fg-subtle">a month</span>
          </p>

          <p className="mt-4 text-[14px] leading-relaxed text-fg-muted">
            For the point where the library is big enough that you stop reading
            it yourself and start asking it questions.
          </p>

          <div className="mt-7 flex gap-8 border-y border-border py-5">
            <Allowance
              value={PRO.monthlyAnalyses}
              label="setup reviews a month"
              emphasis
            />
            <Allowance
              value={PRO.monthlyVisionAnalyses}
              label="chart reads a month"
              emphasis
            />
          </div>

          <p className="mt-6 text-[13.5px] font-medium tracking-tight text-fg">
            Everything in Free, and:
          </p>

          <ul className="mt-3.5 flex flex-col gap-3">
            {PRO_ADDS.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-[13.5px] leading-snug text-fg-muted"
              >
                <span
                  aria-hidden="true"
                  className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-soft"
                >
                  <Check className="size-2.5 text-accent" strokeWidth={2.6} />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-1 lg:mt-auto">
            <Button asChild size="lg" fullWidth>
              <Link href={ROUTES.signup}>Start free</Link>
            </Button>
            <p className="mt-3 text-center text-[12.5px] leading-snug text-fg-subtle">
              You cannot pay for this yet. Accounts made now start on Free, and
              Pro becomes a choice the day billing is live.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
