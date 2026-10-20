"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

/** One curve for everything that enters; one spring for everything you touch. */
const ENTER = [0.16, 1, 0.3, 1] as const;
const PRESS = { type: "spring", stiffness: 420, damping: 30, mass: 0.7 } as const;

export function MarketingNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The sheet covers the page, so the page behind it must not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-[100]">
      {/* The frosted pane of the bar is its own layer, so the bar can fade from
          invisible to glass on scroll without animating a blur — which
          jitters. Nothing here sits in a 3D context, so the blur composes
          correctly on every browser, iOS included. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[calc(4rem+env(safe-area-inset-top))]",
          "backdrop-blur-2xl transition-opacity duration-500",
          "bg-white/60 dark:bg-[#07090f]/55",
          "after:absolute after:inset-x-0 after:bottom-0 after:h-px",
          "after:bg-gradient-to-r after:from-transparent after:via-black/10 after:to-transparent",
          "dark:after:via-white/[0.09]",
          scrolled || open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* The overlay is painted before the bar and carries no z-index of its
          own, so the bar — which does — stays above it and the close button
          keeps working. */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.28, ease: ENTER }}
            className={cn(
              "fixed inset-0 flex h-dvh flex-col backdrop-blur-2xl md:hidden",
              "bg-white/85 dark:bg-[#07090f]/88",
            )}
            style={{
              paddingTop: "calc(4rem + env(safe-area-inset-top))",
              paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
            }}
          >
            <nav aria-label="Mobile" className="flex flex-col px-5 pt-6">
              {LINKS.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.36,
                    delay: reduceMotion ? 0 : 0.04 + index * 0.05,
                    ease: ENTER,
                  }}
                  className={cn(
                    "flex min-h-[3.25rem] items-center border-b border-black/[0.06] text-[1.35rem]",
                    "font-medium tracking-tight text-fg transition-colors duration-200",
                    "active:text-accent dark:border-white/[0.07]",
                  )}
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-2.5 px-5">
              {isAuthenticated ? (
                <Button asChild size="lg" fullWidth onClick={() => setOpen(false)}>
                  <Link href={ROUTES.dashboard}>Open dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    variant="secondary"
                    fullWidth
                    onClick={() => setOpen(false)}
                  >
                    <Link href={ROUTES.login}>Log in</Link>
                  </Button>
                  <Button asChild size="lg" fullWidth onClick={() => setOpen(false)}>
                    <Link href={ROUTES.signup}>Start free</Link>
                  </Button>
                </>
              )}
              <p className="mt-1 text-center text-[12.5px] text-fg-subtle">
                Free while we build it. No card.
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <nav
        aria-label="Main"
        className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-5 sm:px-8"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      >
        <Link
          href={ROUTES.home}
          aria-label="SetupVault home"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          <Logo />
        </Link>

        <ul className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative rounded-lg px-3 py-2 text-[13.5px] text-fg-muted transition-colors duration-300 hover:text-fg"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link href={ROUTES.dashboard}>Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={ROUTES.login}>Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={ROUTES.signup}>Start free</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 md:hidden">
          <ThemeToggle />
          <motion.button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            transition={PRESS}
            className={cn(
              // 44px on a phone: the smallest target a thumb hits reliably.
              "inline-flex size-11 items-center justify-center rounded-full",
              "border border-black/[0.07] bg-black/[0.03] backdrop-blur-2xl",
              "dark:border-white/[0.07] dark:bg-white/[0.03]",
              "text-fg-muted shadow-[inset_0_1px_0_0_rgb(255_255_255/0.5)] dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.07)]",
              "transition-colors duration-300 hover:text-fg",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            )}
          >
            {open ? (
              <X className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Menu className="size-[19px]" strokeWidth={1.8} aria-hidden="true" />
            )}
          </motion.button>
        </div>
      </nav>
    </header>
  );
}
