"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdatePreferences } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/types/database";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
];

export function AppearanceCard({
  userId,
  preference,
}: {
  userId: string;
  preference: ThemePreference;
}) {
  const { theme, setTheme } = useTheme();
  const mutation = useUpdatePreferences(userId);

  const current = (theme as ThemePreference | undefined) ?? preference;

  const choose = async (value: ThemePreference) => {
    const previous = current;
    setTheme(value);

    try {
      await mutation.mutateAsync({ theme: value });
    } catch {
      setTheme(previous);
      toast.error("Theme could not be saved. Try again in a moment.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Saved to your account, so it follows you to another device.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <fieldset>
          <legend className="sr-only">Theme</legend>
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid grid-cols-3 gap-2 sm:max-w-md"
          >
            {OPTIONS.map(({ value, label, icon: Icon }) => {
              const active = current === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={mutation.isPending}
                  onClick={() => void choose(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-fg"
                      : "border-border bg-surface-raised text-fg-muted hover:bg-surface-hover hover:text-fg",
                    mutation.isPending && "opacity-70",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
