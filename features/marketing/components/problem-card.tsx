"use client";

import { useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Brain, Images, NotebookPen, Table2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * One of the four places the record already lives.
 *
 * Three things here are deliberate and worth reading before changing them,
 * because two are WebKit traps this project has already fallen into.
 *
 * 1. There is no `transform-style: preserve-3d` anywhere in this file, and
 *    there must not be. WebKit drops any layer carrying a `backdrop-filter`
 *    inside a preserve-3d context — measured in this codebase three separate
 *    times — so a glass card that tilts inside a 3D context loses its blur on
 *    every iPhone. The card gets `transformPerspective` on its own transform
 *    instead, which gives true perspective rotation on a single element
 *    without opening a 3D context for its children. The orb's depth is then
 *    sold by counter-parallax — it slides against the lean — rather than by
 *    translateZ, which would need the very context that breaks the glass.
 *
 * 2. The entrance is not `whileInView`. That is an IntersectionObserver, and
 *    an observer can report a miss for a plainly visible element inside a
 *    transformed ancestor, which is exactly what these cards are. A miss
 *    leaves text at `opacity: 0`, so the failure mode is invisible copy. The
 *    entrance is `.sv-reveal-scroll` instead: a CSS scroll-driven animation
 *    that runs off the main thread, is already reduced-motion guarded, and
 *    whose base state is `opacity: 1`, so it fails open.
 *
 * 3. The tilt only runs for a mouse. A pointermove during a tap would tip the
 *    card on a phone for no reason and fight the scroll, so touch gets a
 *    press response instead: the one of these a thumb can actually feel.
 */

/**
 * The icons live on this side of the boundary, keyed by name.
 *
 * They used to be passed in as components from the server component that
 * owns the copy, which cost the whole page its server rendering: a React
 * component is a function, functions are not serialisable across the RSC
 * boundary, and the server render threw on every request
 * ("Functions cannot be passed directly to Client Components"). Next then
 * recovered by rendering the entire landing page on the client — no error
 * in the browser console, no failing build, just an empty document shell
 * going out to every visitor and every crawler.
 *
 * A string key is serialisable. The mapping belongs here anyway: which glyph
 * stands for "a notes app" is a presentation decision, not a content one.
 */
const ICONS = {
  screenshots: Images,
  spreadsheet: Table2,
  notes: NotebookPen,
  memory: Brain,
} as const;

export type PlaceIcon = keyof typeof ICONS;

export interface Place {
  where: string;
  what: string;
  icon: PlaceIcon;
}

/** Degrees of lean at the very corner of the card. */
const MAX_TILT = 7;
/** Pixels the orb slides against that lean. */
const ORB_PARALLAX = 16;
/** Peak strength of the light that follows the cursor. */
const GLOW_ALPHA = 0.14;

const SPRING = { stiffness: 260, damping: 26, mass: 0.6 } as const;

export function ProblemCard({ place, index }: { place: Place; index: number }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // -0.5..0.5 from the centre of the card, sprung so the lean carries weight
  // and can be interrupted mid-motion instead of restarting.
  const px = useSpring(0, SPRING);
  const py = useSpring(0, SPRING);

  const rotateY = useTransform(px, (v) => v * MAX_TILT * 2);
  const rotateX = useTransform(py, (v) => v * -MAX_TILT * 2);

  // Opposite direction, which is what reads as the orb sitting proud of the
  // card without a 3D context existing anywhere. See note 1.
  const orbX = useTransform(px, (v) => v * -ORB_PARALLAX);
  const orbY = useTransform(py, (v) => v * -ORB_PARALLAX);

  // Motion values rather than state: a React render per pointermove would be
  // the entire frame budget, and writing a custom property onto the card
  // would invalidate style for every child on every frame.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowOpacity = useSpring(0, { stiffness: 180, damping: 30 });
  const glow = useMotionTemplate`radial-gradient(260px circle at ${glowX}px ${glowY}px, var(--accent), transparent 72%)`;

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    // A finger is not a cursor.
    if (event.pointerType !== "mouse" || reduceMotion) return;
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);

    glowX.set(event.clientX - rect.left);
    glowY.set(event.clientY - rect.top);
    glowOpacity.set(GLOW_ALPHA);
  }

  function handleLeave() {
    px.set(0);
    py.set(0);
    glowOpacity.set(0);
  }

  const Icon = ICONS[place.icon];

  return (
    <div
      className="sv-reveal-scroll"
      style={{ "--sv-delay": `${index * 70}ms` } as React.CSSProperties}
    >
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        whileTap={reduceMotion ? undefined : { scale: 0.985 }}
        // Passed unconditionally: under reduced motion the handler returns
        // before setting anything, so these stay at zero and the card simply
        // does not lean. A conditional style prop would mean a conditional
        // hook, which is worse than a transform that never changes.
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "group relative isolate overflow-hidden rounded-2xl",
          // The shared glass material. Blur stays a Tailwind utility because
          // the build strips a hand-written backdrop-filter out of custom CSS.
          "glass-card backdrop-blur-xl backdrop-saturate-150",
          "px-5 py-6 sm:px-7 sm:py-8",
          "transition-[border-color] duration-300 hover:border-accent/30",
        )}
      >
        {/* The light that follows the cursor: under the content, above the
            glass, and pointer-events-none so it never eats a click. Its peak
            is 14% — a brighter wash would cost the body copy its contrast,
            which is the whole reason this is a tint and not a fill. */}
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: glow, opacity: glowOpacity }}
        />

        <div className="flex items-start gap-4 sm:gap-6">
          {/* ──────────────────────────────────────────────────────────────
              THE 3D SLOT

              A CSS sphere for now. To drop in a real asset, replace the
              contents of this motion.div: the box is already sized, centred
              and parallaxed, so a

                <Spline scene="https://prod.spline.design/YOUR_SCENE/scene.splinecode" />

              or an R3F <Canvas> placed straight inside inherits the layout
              and the motion with no further wiring.

              One caution before you do. This page already runs an R3F canvas
              behind the hero, and a second WebGL context on the same document
              is a real cost — four more would be four more. If you embed
              here, prefer one shared canvas rendering all four orbs over four
              separate ones, and measure before and after; the hero's backdrop
              alone was 90ms a frame until it was made render-on-demand.
              ────────────────────────────────────────────────────────────── */}
          <motion.div
            className="relative size-14 shrink-0 sm:size-[4.5rem]"
            style={{ x: orbX, y: orbY }}
          >
            {/* The glow it casts onto the card. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-accent/25 blur-xl"
            />

            {/* The sphere. A lit body, not a disc with a gradient on it: the
                highlight sits off centre and the terminator falls away
                towards the opposite corner, which is the whole difference. */}
            <motion.span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 rounded-full",
                "bg-[radial-gradient(circle_at_32%_26%,var(--orb-hi),var(--orb-mid)_44%,var(--orb-lo)_100%)]",
                "shadow-[inset_0_-6px_12px_-6px_rgb(0_0_0/0.55),inset_0_2px_6px_-2px_var(--orb-rim)]",
                "ring-1 ring-inset ring-white/15",
              )}
              animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.45,
              }}
            />

            {/* Specular: small, tight, heavily blurred. The thing the eye
                reads as gloss before it reads anything else. */}
            <span
              aria-hidden="true"
              className="absolute left-[26%] top-[18%] size-3 rounded-full bg-white/70 blur-[5px] sm:size-3.5"
            />

            <span className="absolute inset-0 grid place-items-center">
              <Icon
                className="size-5 text-white drop-shadow-[0_1px_2px_rgb(0_0_0/0.45)] sm:size-6"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
          </motion.div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-medium tracking-tight text-fg sm:text-[17px]">
              {place.where}
            </h3>
            <p className="mt-2 max-w-[44ch] text-[14.5px] leading-relaxed text-fg-muted sm:text-[15px]">
              {place.what}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
