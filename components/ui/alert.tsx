import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Inline, non-dismissible status message used inside forms. */
export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border p-3 text-sm",
        tone === "error"
          ? "border-negative/25 bg-negative-soft text-negative"
          : "border-positive/25 bg-positive-soft text-positive",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="leading-relaxed text-fg">{children}</span>
    </div>
  );
}
