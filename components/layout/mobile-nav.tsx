"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Mobile drawer. It mirrors the desktop sidebar rather than shrinking it. It
 * closes when a link is followed (via SidebarNav's onNavigate) and on Escape.
 */
export function MobileNav({ planLabel }: { planLabel: string }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="glass-strong backdrop-blur-2xl fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-glass-border px-4 py-5 lg:hidden"
              initial={{ x: reduceMotion ? 0 : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: reduceMotion ? 0 : "-100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-7 flex items-center justify-between px-2">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  <X className="size-4" />
                </button>
              </div>

              <SidebarNav onNavigate={() => setOpen(false)} />

              <div className="mt-6 rounded-xl border border-border bg-surface/60 p-3.5">
                <p className="text-xs text-fg-subtle">Current plan</p>
                <p className="mt-1 text-sm font-medium text-fg">{planLabel}</p>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
