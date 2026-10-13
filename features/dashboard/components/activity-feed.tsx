import { Activity } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { SetupRow } from "@/types/database";

/**
 * Activity is derived from the setups themselves rather than a separate event
 * log — there is nothing else in the product yet that generates events.
 */
export function ActivityFeed({ setups }: { setups: SetupRow[] }) {
  if (setups.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Saving, editing and starring setups will show up here as a running history."
      />
    );
  }

  return (
    <ol className="divide-y divide-border">
      {setups.map((setup) => {
        const edited = setup.updated_at !== setup.created_at;
        return (
          <li key={setup.id} className="flex items-start gap-3 px-5 py-3.5">
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate text-sm text-fg">
                {edited ? "Updated" : "Saved"} {setup.title}
              </p>
              <p className="mt-0.5 text-xs text-fg-subtle">
                {formatRelativeTime(edited ? setup.updated_at : setup.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
