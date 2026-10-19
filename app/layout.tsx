import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { GeistMono } from "geist/font/mono";

import { AppProviders } from "@/components/providers";
import { getSiteUrl } from "@/lib/env";

import "./globals.css";

/**
 * Archivo, not Geist.
 *
 * Geist is Vercel's own typeface, so a page that uses it while reaching for
 * Vercel's look is reproducing a default rather than making a choice. Archivo
 * is a grotesque with signage and newspaper heritage: sturdy, large on the
 * body, and it holds a very tight track at display sizes — which is the whole
 * personality of the headline below.
 *
 * Geist Mono stays for numerals. Its tabular figures are genuinely good, and
 * `.numeric` / `.stat` are used on every screen in the product.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  // Everything relative below resolves against this, including the generated
  // share card. Without it Next emits relative OG URLs, which every crawler
  // ignores — the single most common reason a link previews as a grey box.
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "SetupVault — Your Personal Trading Setup Library",
    template: "%s · SetupVault",
  },
  description:
    "Save every trading setup with its chart, thesis and outcome, then find it again in seconds. SetupVault is the searchable library for your own trading.",
  applicationName: "SetupVault",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SetupVault — Your Personal Trading Setup Library",
    description:
      "Save every trading setup with its chart, thesis and outcome, then find it again in seconds.",
    url: "/",
    siteName: "SetupVault",
    type: "website",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: "SetupVault — Your Personal Trading Setup Library",
    description:
      "Save every trading setup with its chart, thesis and outcome, then find it again in seconds.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  // Matches the two canvas tokens, so the iOS status bar blends into the page
  // rather than sitting on a strip of the wrong colour.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#07090f" },
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // Required, and it belongs here rather than on ThemeProvider: next-themes
      // writes the theme class onto this element in a blocking script before
      // React runs, so the server and client markup differ by design. Without
      // this, every production build logs a hydration mismatch.
      suppressHydrationWarning
      className={`${archivo.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-dvh overflow-x-clip bg-canvas text-fg antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
