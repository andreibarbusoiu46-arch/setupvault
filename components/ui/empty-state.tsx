import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** Used everywhere real data does not exist yet. Never a stand-in for fake data. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised">
        <Icon className="size-4.5 text-fg-subtle" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[38ch] text-sm leading-relaxed text-fg-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
