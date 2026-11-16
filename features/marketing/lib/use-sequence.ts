"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A scroll-triggered step counter for the product demonstrations.
 *
 * Three decisions, each of which is a bug this file exists to avoid.
 *
 * **It starts finished.** The server renders, and the first client render
 * paints, the completed state — every candle drawn, every row present, every
 * number at its final value. Only after mount does the hook wind back to
 * zero, and only if the element is still off screen. A demonstration that
 * begins empty is a demonstration that stays empty when an observer never
 * fires, a script fails, or the markup is read without JavaScript, and this
 * project has shipped that bug before: mockups that rendered as blank panels
 * for anyone whose script budget ran out. The animation is a refinement of a
 * correct picture, never the thing that produces it.
 *
 * **It does not rewind in place.** Once a sequence has played it stays
 * played. A replay is armed only after the element has fully left the
 * viewport, so scrolling back a few pixels at the boundary cannot restart it
 * — which is the usual way these become strobe lights.
 *
 * **It costs one render per step, not one per frame.** Six steps over three
 * seconds is six renders. Everything that moves between steps is a transform
 * or a motion value, which never touches React at all.
 */

export interface SequenceOptions {
  /** Milliseconds before each step lands, measured from the start. */
  at: readonly number[];
  /** How much of the element must be showing before it counts as seen. */
  amount?: number;
}

export function useSequence<T extends HTMLElement = HTMLDivElement>({
  at,
  amount = 0.3,
}: SequenceOptions) {
  const ref = useRef<T>(null);
  const total = at.length;

  // Finished, until the client says otherwise. See the note above.
  const [step, setStep] = useState(total);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Nothing to do, and deliberately no setState: the state already holds
      // the completed step, so writing it again would only be a cascading
      // render. The completed state is the whole point; it is the motion
      // between states that is optional.
      return;
    }

    let timers: number[] = [];
    let armed = false;
    let played = false;

    const clear = () => {
      for (const t of timers) window.clearTimeout(t);
      timers = [];
    };

    const play = () => {
      clear();
      setStep(0);
      at.forEach((ms, index) => {
        timers.push(window.setTimeout(() => setStep(index + 1), ms));
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= amount) {
          // The very first callback fires immediately on observe. If the
          // element is already on screen then the reader is looking at it
          // right now, and winding back to zero would be a visible flash of
          // an empty panel. Leave it finished and let the next approach
          // play it.
          if (!armed) {
            armed = true;
            played = true;
            return;
          }
          if (!played) {
            played = true;
            play();
          }
          return;
        }

        armed = true;
        if (entry.intersectionRatio === 0) {
          // Fully gone. Arm the next approach.
          played = false;
        }
      },
      { threshold: [0, amount] },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      clear();
    };
    // `at` is a module-level constant at every call site, so this runs once.
  }, [at, amount, total]);

  return { ref, step, total };
}
