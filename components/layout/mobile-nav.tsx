"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Mobile drawer. It mirrors the desktop sidebar rather than shrinking it.
 *
 * The drawer and its scrim are rendered through a portal into <body>, and
 * that is load-bearing rather than tidiness. This component is mounted inside
 * the Topbar's <header>, which carries `backdrop-blur-xl` — and an element
 * with a backdrop-filter becomes the containing block for every
 * `position: fixed` descendant. So `fixed inset-y-0` resolved against a 56px
 * header instead of the viewport: the drawer rendered 56px tall, which is
 * exactly the strip of logo-and-close-button that was showing with the
 * dashboard visible underneath it. The scrim was trapped in the same box, so
 * nothing dimmed either.
 *
 * Measured, not guessed: a fixed child of a blurred header reports 56px
 * height, the same child under a plain header reports the full 844.
 *
 * This is also why raising z-index or forcing `h-[100dvh]` does not fix it.
 * The element is not behind anything and it is not short — it is in the
 * wrong coordinate system, and it would scroll away with the header the
 * moment the page moved. Only leaving that subtree fixes it.
 */
export function MobileNav({ planLabel }: { planLabel: string }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Portals need a DOM to target, so nothing is portalled during the server
  // render. Same server/client snapshot pattern as the theme toggle: no
  // setState in an effect, no extra cascading render.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);

    // Lock the page behind the drawer. `position: fixed` on the body rather
    // than `overflow: hidden`, because iOS Safari ignores overflow on body
    // and happily scrolls the page under a modal anyway. The scroll offset is
    // stashed and restored so closing the menu does not jump you to the top.
    const scrollY = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const drawer = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/70 lg:hidden"
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
            className={[
              "fixed inset-y-0 left-0 z-[100] flex h-[100dvh] w-72 max-w-[85vw] flex-col lg:hidden",
              // Opaque base, so the panel occludes whether or not the browser
              // composes a backdrop-filter — see the note on .glass-strong.
              "glass-strong overflow-y-auto overscroll-contain border-r border-border-strong",
              "px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]",
            ].join(" ")}
            initial={{ x: reduceMotion ? 0 : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduceMotion ? 0 : "-100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-7 flex shrink-0 items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                // 44px: the smallest target a thumb hits reliably.
                className="-mr-1.5 flex size-11 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
              >
                <X className="size-5" />
              </button>
            </div>

            <SidebarNav roomy onNavigate={() => setOpen(false)} />

            <div className="mt-6 shrink-0 rounded-xl border border-border bg-surface-raised p-3.5">
              <p className="text-xs text-fg-subtle">Current plan</p>
              <p className="mt-1 text-sm font-medium text-fg">{planLabel}</p>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        aria-expanded={open}
        className="-ml-2 flex size-11 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}
