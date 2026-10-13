import Link from "next/link";
import { Library, Star } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { formatRatio } from "@/lib/risk-reward";
import { ROUTES } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import type { SetupRow } from "@/types/database";

/**
 * Renders real rows from the database. The empty state is what shows when the
 * user genuinely has nothing saved.
 */
export function SetupList({
  setups,
  emptyTitle,
  emptyDescription,
  emptyIcon = Library,
  emptyAction,
}: {
  setups: SetupRow[];
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: typeof Library;
  emptyAction?: React.ReactNode;
}) {
  if (setups.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {setups.map((setup) => {
        const ratio = formatRatio(
          setup.risk_reward === null ? null : Number(setup.risk_reward),
        );

        return (
          <li key={setup.id}>
            <Link
              href={`${ROUTES.setups}/${setup.id}`}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-hover"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-fg">{setup.title}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-fg-subtle">
                  <span className="numeric text-fg-muted">{setup.ticker}</span>
                  <DirectionBadge direction={setup.direction} variant="text" />
                  {ratio ? <span className="numeric">{ratio}</span> : null}
                  <span className="hidden sm:inline">
                    {formatRelativeTime(setup.created_at)}
                  </span>
                </p>
              </div>

              {setup.is_favorite ? (
                <Star
                  className="size-3.5 shrink-0 fill-accent text-accent"
                  aria-label="Favourite"
                />
              ) : null}

              <ResultBadge result={setup.result} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
