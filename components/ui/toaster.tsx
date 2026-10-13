"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!glass-strong !rounded-xl !text-fg !shadow-elevated !text-sm",
          description: "!text-fg-muted",
          actionButton: "!bg-accent !text-accent-fg",
        },
      }}
    />
  );
}
