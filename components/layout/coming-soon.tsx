import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/lib/routes";

/**
 * A real destination for a feature that is not built yet. It states plainly
 * what will be here and offers no controls that do nothing.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  bullets,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <Card glass className="mx-auto max-w-2xl p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-raised">
          <Icon className="size-4.5 text-accent" aria-hidden="true" />
        </div>
        <Badge>Coming next</Badge>
      </div>

      <h2 className="mt-5 text-xl font-semibold tracking-tight text-fg">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{description}</p>

      <ul className="mt-6 flex flex-col gap-2.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5 text-sm text-fg-muted">
            <span
              className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle"
              aria-hidden="true"
            />
            {bullet}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Button asChild variant="secondary">
          <Link href={ROUTES.dashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </Card>
  );
}
