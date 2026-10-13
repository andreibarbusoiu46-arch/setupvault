import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FEATURE_DESCRIPTIONS,
  FEATURE_LABELS,
  requiredTier,
  type AIFeature,
} from "@/lib/feature-access";

const TIER_NAMES = { free: "Free", pro: "Pro", elite: "Elite" } as const;

/**
 * Locked state for a premium feature. It states plainly what the feature does
 * and which plan includes it — and, since billing does not exist yet, the
 * action goes to the pricing section rather than pretending to sell anything.
 */
export function LockedFeature({ feature }: { feature: AIFeature }) {
  const tier = requiredTier(feature);

  return (
    <Card glass className="p-5">
      <div className="flex items-center gap-2.5">
        <Sparkles className="size-4 text-accent" aria-hidden="true" />
        <h3 className="text-sm font-medium text-fg">{FEATURE_LABELS[feature]}</h3>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        {FEATURE_DESCRIPTIONS[feature]}
      </p>

      <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-fg-subtle">
        <Lock className="size-3" aria-hidden="true" />
        Included with {TIER_NAMES[tier]}
      </p>

      <div className="mt-5">
        <Button asChild variant="secondary" size="sm">
          <Link href="/#pricing">See plans</Link>
        </Button>
      </div>
    </Card>
  );
}
