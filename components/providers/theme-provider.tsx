"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes, mounted normally.
 *
 * The previous version withheld NextThemesProvider until a `mounted` state
 * flipped in an effect. That defeats the library: it works by injecting a
 * blocking script that sets the class on <html> before the first paint, and
 * it cannot do that if it is not in the server-rendered tree. The result was
 * a provider that mounted too late to apply the stored theme — which looks
 * exactly like a toggle that does nothing.
 *
 * `suppressHydrationWarning` on <html> in the root layout is what makes this
 * safe; the class attribute is expected to differ between server and client.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
