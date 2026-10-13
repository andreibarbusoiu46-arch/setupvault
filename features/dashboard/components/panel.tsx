import { Card } from "@/components/ui/card";

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card glass className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-medium text-fg">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}
