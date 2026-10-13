import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "@/features/marketing/components/section";

const PLANS = [
  {
    name: "Free",
    price: "€0",
    cadence: "while in early access",
    description: "The full library, for the traders helping us shape it.",
    features: [
      "Unlimited setups",
      "Screenshots, tags and notes",
      "Favourites and filters",
      "Your data, exportable",
    ],
    cta: "Start free",
    available: true,
  },
  {
    name: "Pro",
    price: "—",
    cadence: "pricing not set",
    description:
      "Deeper analysis of your own library: performance by strategy, by session, by tag.",
    features: [
      "Everything in Free",
      "Performance breakdowns",
      "Pattern insights",
      "Priority support",
    ],
    cta: "Not available yet",
    available: false,
  },
];

/**
 * Pricing.
 *
 * There is no monthly/annual switch here on purpose. Pro has no price yet,
 * and a toggle whose only honest job would be to move a dash from one column
 * to another is a control that implies a commercial offer that does not
 * exist. It goes in the moment there are two real numbers to switch between.
 *
 * The depth is built from tokens rather than literal white, so the glass
 * reads correctly in both themes: translucent and bright on light, a thin
 * lifted pane on dark.
 */
export function PricingPreview() {
  return (
    <Section id="pricing" className="border-t border-border">
      <SectionHeading
        title="Free while we build the library"
        description="Paid plans arrive when there is enough in the product to justify them. Early accounts keep access to everything they signed up with."
      />

      <div className="mt-10 grid gap-4 sm:mt-12 lg:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "glass relative flex flex-col rounded-2xl p-6 sm:p-7",
              // The live plan is lifted; the unpriced one recedes without
              // being so faint that it becomes unreadable on a phone.
              plan.available
                ? "ring-1 ring-accent/25"
                : "opacity-80 dark:opacity-70",
            )}
          >
            {plan.available ? (
              <>
                {/* A single soft highlight behind the card rather than a glow
                    around it — depth, not a neon edge. */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 -top-10 sm:-inset-x-6 -z-10 h-32 rounded-full bg-accent/10 blur-3xl"
                />
              </>
            ) : null}

            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-medium text-fg">{plan.name}</h3>
              {plan.available ? (
                <Badge>
                  <Sparkles className="size-3" aria-hidden="true" />
                  Early access
                </Badge>
              ) : (
                <Badge>Later</Badge>
              )}
            </div>

            <p className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="numeric text-3xl font-semibold text-fg sm:text-4xl">
                {plan.price}
              </span>
              <span className="text-sm text-fg-subtle">{plan.cadence}</span>
            </p>

            <p className="mt-3 text-sm leading-relaxed text-fg-muted">
              {plan.description}
            </p>

            <ul className="mt-6 flex flex-col gap-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 text-sm text-fg-muted"
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-soft"
                  >
                    <Check className="size-3 text-accent" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* mt-auto keeps both buttons on the same line once the cards sit
                side by side, whatever the copy length. */}
            <div className="mt-7 pt-1 lg:mt-auto">
              {plan.available ? (
                <Button asChild size="lg" fullWidth>
                  <Link href={ROUTES.signup}>{plan.cta}</Link>
                </Button>
              ) : (
                <Button size="lg" fullWidth variant="secondary" disabled>
                  {plan.cta}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
