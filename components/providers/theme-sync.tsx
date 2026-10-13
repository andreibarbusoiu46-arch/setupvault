"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

import type { ThemePreference } from "@/types/database";

/**
 * The saved preference lives in the user's profile so it follows them between
 * devices. next-themes owns the local value; this reconciles the two once the
 * profile is known.
 */
export function ThemeSync({ preference }: { preference: ThemePreference }) {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme !== preference) setTheme(preference);
    // Only re-run when the stored preference itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preference]);

  return null;
}
