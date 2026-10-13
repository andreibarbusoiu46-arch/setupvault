import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9.5 w-full rounded-lg border border-border-strong bg-canvas-subtle px-3 text-sm text-fg",
        "placeholder:text-fg-subtle",
        "transition-colors focus:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
