"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import {
  CANDLES,
  CANDLE_COUNT,
  EMA_FAST,
  EMA_SLOW,
  FINAL_FRAME,
  FVG,
  INSTRUMENT,
  KEY_LEVEL,
  RANGE,
  frameAt,
  type Frame,
} from "@/features/marketing/data/breakout-sim";

/**
 * The hero chart: a candlestick session that runs its own story.
 *
 * Every frame is written straight to the DOM from a rAF loop. Nothing here
 * calls setState while the animation runs — React is used once, to put 52
 * candle elements on the page, and after that the loop only moves
 * attributes. The one exception is `onEvent`, which fires at the three
 * milestones in a 19-second cycle rather than per frame, so the notification
 * stack beside it stays in step without a timer of its own drifting.
 *
 * The EMA ribbon is revealed with `stroke-dashoffset` against a precomputed
 * path rather than by rebuilding `d` each frame: same picture, no string
 * allocation sixty times a second.
 *
 * It is illustrative demo data, labelled as such on the page. It is not a
 * feed, and the page never claims the product predicts a break.
 */

const VIEW_W = 1000;
const VIEW_H = 430;
const PAD = { left: 18, right: 132, top: 30, bottom: 44 };

const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;
const STEP = PLOT_W / CANDLE_COUNT;
const BODY_W = Math.max(STEP * 0.58, 2);

const y = (price: number) =>
  PAD.top + ((RANGE.max - price) / (RANGE.max - RANGE.min)) * PLOT_H;
const x = (index: number) => PAD.left + (index + 0.5) * STEP;

/** Round prices onto a readable grid for the axis. */
const AXIS = (() => {
  const step = 10;
  const top = Math.floor(RANGE.max / step) * step;
  const out: number[] = [];
  for (let p = top; p > RANGE.min; p -= step) out.push(p);
  return out;
})();

function emaPath(series: readonly number[]): string {
  return series
    .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
}

const FAST_PATH = emaPath(EMA_FAST);
const SLOW_PATH = emaPath(EMA_SLOW);
/** Generous: the exact length only has to be an upper bound for the reveal. */
const PATH_LEN = Math.round(PLOT_W * 2.2);

export type SceneEvent = "break" | "target" | "complete" | "reset";

export function TradingScene({
  className,
  onEvent,
}: {
  className?: string;
  onEvent?: (event: SceneEvent) => void;
}) {
  const root = useRef<SVGSVGElement>(null);
  const bodies = useRef<(SVGRectElement | null)[]>([]);
  const wicks = useRef<(SVGLineElement | null)[]>([]);
  const fast = useRef<SVGPathElement>(null);
  const slow = useRef<SVGPathElement>(null);
  const fvg = useRef<SVGRectElement>(null);
  const tagGroup = useRef<SVGGElement>(null);
  const tagText = useRef<SVGTextElement>(null);
  const tagLine = useRef<SVGLineElement>(null);
  const layer = useRef<SVGGElement>(null);
  // Kept in a ref so the loop always calls the latest handler without the
  // effect below having to tear down and restart the animation when the
  // parent re-renders. Written in an effect, not during render.
  const emit = useRef(onEvent);
  useEffect(() => {
    emit.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const node = root.current;
    if (!node) return;

    /** One frame, written to the DOM. No allocation beyond the price string. */
    const draw = (f: Frame) => {
      layer.current?.setAttribute("opacity", String(f.opacity));

      for (let i = 0; i < CANDLE_COUNT; i++) {
        const body = bodies.current[i];
        const wick = wicks.current[i];
        if (!body || !wick) continue;

        if (i >= f.count) {
          body.setAttribute("opacity", "0");
          wick.setAttribute("opacity", "0");
          continue;
        }

        const c = CANDLES[i];
        const forming = i === f.count - 1 && f.partial < 1;
        // The forming candle grows out of its own open rather than appearing
        // whole, which is what makes the series read as printing live.
        const k = forming ? f.partial : 1;
        const close = c.open + (c.close - c.open) * k;
        const high = Math.max(c.open, close) + (c.high - Math.max(c.open, c.close)) * k;
        const low = Math.min(c.open, close) - (Math.min(c.open, c.close) - c.low) * k;
        const bull = close >= c.open;

        const top = y(Math.max(c.open, close));
        const height = Math.max(Math.abs(y(c.open) - y(close)), 1.1);

        body.setAttribute("x", (x(i) - BODY_W / 2).toFixed(1));
        body.setAttribute("y", top.toFixed(1));
        body.setAttribute("height", height.toFixed(1));
        body.setAttribute("opacity", "1");
        body.setAttribute("class", bull ? "fill-[#10b981]" : "fill-[#f0566d]");

        wick.setAttribute("x1", x(i).toFixed(1));
        wick.setAttribute("x2", x(i).toFixed(1));
        wick.setAttribute("y1", y(high).toFixed(1));
        wick.setAttribute("y2", y(low).toFixed(1));
        wick.setAttribute("opacity", "1");
        wick.setAttribute("class", bull ? "stroke-[#10b981]" : "stroke-[#f0566d]");
      }

      const revealed = (f.count - 1 + f.partial) / CANDLE_COUNT;
      const offset = PATH_LEN * (1 - Math.max(revealed, 0));
      fast.current?.setAttribute("stroke-dashoffset", offset.toFixed(1));
      slow.current?.setAttribute("stroke-dashoffset", offset.toFixed(1));

      // The imbalance only exists once the candle that opened it has printed.
      fvg.current?.setAttribute(
        "opacity",
        f.count - 1 >= FVG.to ? "1" : "0",
      );

      const py = y(f.price);
      tagGroup.current?.setAttribute("transform", `translate(0 ${py.toFixed(1)})`);
      tagLine.current?.setAttribute("y1", py.toFixed(1));
      tagLine.current?.setAttribute("y2", py.toFixed(1));
      if (tagText.current) {
        tagText.current.textContent = f.price.toFixed(2);
      }
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (still.matches) {
      // The composition is the point, not the motion: show the finished
      // chart and fire the milestones once so the notifications still read.
      draw(FINAL_FRAME);
      emit.current?.("break");
      emit.current?.("target");
      emit.current?.("complete");
      return;
    }

    let raf = 0;
    // Set from the first frame's own timestamp rather than from
    // performance.now(), because the two are not interchangeable: a rAF
    // timestamp marks the start of the frame and can precede a reading taken
    // during it.
    let origin = 0;
    let seen = { broken: false, target: false, complete: false };
    let running = false;

    let hasDrawn = false;

    const tick = (now: number) => {
      if (origin === 0) origin = now - paused;
      const f = frameAt((now - origin) / 1000);
      draw(f);
      hasDrawn = true;

      if (f.broken && !seen.broken) {
        seen.broken = true;
        emit.current?.("break");
      }
      if (f.reachedTarget && !seen.target) {
        seen.target = true;
        emit.current?.("target");
      }
      if (f.complete && !seen.complete) {
        seen.complete = true;
        emit.current?.("complete");
      }
      // The cycle has wrapped: clear the latches so the next pass fires its
      // milestones exactly once again, rather than never or every frame.
      if (!f.broken && seen.broken) {
        seen = { broken: false, target: false, complete: false };
        emit.current?.("reset");
      }

      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      // Rebased on the next frame, from that frame's own clock, so a paused
      // scene resumes where it stopped.
      origin = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      paused = origin === 0 ? paused : performance.now() - origin;
      cancelAnimationFrame(raf);
    };
    let paused = 0;

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (onScreen) start();
    };

    // Start immediately; the observer only ever pauses.
    //
    // Gating the start on the observer was a race, and it lost often: this
    // SVG lives inside a rotated, aspect-sized plane, so on the first
    // callback it can still measure zero and report "not intersecting". The
    // observer then never fires again — nothing about the element changes —
    // and the chart sits at its initial frame forever. It showed up as a
    // price tag reading 0.00 at five of seven widths.
    let onScreen = true;
    start();

    const observer = new IntersectionObserver(
      ([entry]) => {
        // A zero-sized rect is layout that has not settled, not an element
        // that has scrolled away. Trusting it stopped the loop a beat after
        // it started and the observer never fired again, because nothing
        // about the element changed afterwards.
        // Never stop a scene that has not painted yet. The observer's first
        // callback can land before the first animation frame does, and if it
        // reports a miss there, cancelling leaves the chart frozen on its
        // initial frame with nothing left to wake it — which showed up as a
        // price tag reading 0.00 on roughly one load in three, at no
        // particular width. Pausing is only ever an optimisation; starting
        // is correctness, so starting wins ties.
        const measured = entry.boundingClientRect.width > 0;
        if (!measured) return;

        // A miss is verified against a real rect before it is believed. This
        // SVG sits inside an ancestor carrying rotateX, rotateY and rotateZ,
        // and the observer computes intersection from that transformed quad;
        // when the quad is momentarily degenerate it reports a miss for an
        // element filling half the screen. Trusting it froze the chart on
        // about one load in fourteen.
        let visible = entry.isIntersecting;
        if (!visible) {
          const r = node.getBoundingClientRect();
          visible =
            r.width > 0 &&
            r.height > 0 &&
            r.bottom > -120 &&
            r.top < window.innerHeight + 120;
        }

        onScreen = visible;
        if (onScreen && !document.hidden) start();
        else if (hasDrawn) stop();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <svg
      ref={root}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={`Illustrative ${INSTRUMENT} session breaking a key level at ${KEY_LEVEL}`}
    >
      <defs>
        <linearGradient id="ts-fvg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#4f8cff" stopOpacity="0.05" />
        </linearGradient>
        <filter id="ts-glow" x="-8%" y="-30%" width="116%" height="160%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g ref={layer}>
        {/* Horizontals and their prices. Faint: a grid you can read a level
            against, never one you notice. */}
        {AXIS.map((price) => (
          <g key={price}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={y(price)}
              y2={y(price)}
              className="stroke-fg"
              strokeOpacity="0.055"
              strokeWidth="1"
            />
            <text
              x={VIEW_W - PAD.right + 10}
              y={y(price) + 3.5}
              className="fill-fg-subtle font-mono text-[10px]"
            >
              {price.toFixed(0)}
            </text>
          </g>
        ))}

        {/* The imbalance the impulse left behind. */}
        <rect
          ref={fvg}
          x={x(FVG.from)}
          y={y(FVG.high)}
          width={VIEW_W - PAD.right - x(FVG.from)}
          height={Math.max(y(FVG.low) - y(FVG.high), 2)}
          fill="url(#ts-fvg)"
          opacity="0"
          className="transition-opacity duration-500"
        />

        {/* The level the range kept failing at. */}
        <line
          x1={PAD.left}
          x2={VIEW_W - PAD.right}
          y1={y(KEY_LEVEL)}
          y2={y(KEY_LEVEL)}
          stroke="#4f8cff"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeDasharray="7 6"
        />
        <text
          x={VIEW_W - PAD.right - 10}
          y={y(KEY_LEVEL) - 7}
          textAnchor="end"
          className="fill-[#8fb4ff] font-mono text-[10px]"
        >
          {KEY_LEVEL.toFixed(2)}
        </text>

        {/* Two bands, drawn under the candles so they read as support. */}
        <path
          ref={slow}
          d={SLOW_PATH}
          fill="none"
          stroke="#4f8cff"
          strokeOpacity="0.3"
          strokeWidth="1.6"
          strokeDasharray={PATH_LEN}
          strokeDashoffset={PATH_LEN}
        />
        <path
          ref={fast}
          d={FAST_PATH}
          fill="none"
          stroke="#10b981"
          strokeOpacity="0.42"
          strokeWidth="1.6"
          strokeDasharray={PATH_LEN}
          strokeDashoffset={PATH_LEN}
        />

        {/* 52 candles, created once and moved by the loop. */}
        <g filter="url(#ts-glow)">
          {CANDLES.map((_, i) => (
            <line
              key={`w${i}`}
              ref={(el) => {
                wicks.current[i] = el;
              }}
              strokeWidth="1.1"
              opacity="0"
            />
          ))}
          {CANDLES.map((_, i) => (
            <rect
              key={`b${i}`}
              ref={(el) => {
                bodies.current[i] = el;
              }}
              width={BODY_W}
              rx="0.8"
              opacity="0"
            />
          ))}
        </g>

        {/* The live reading, tracking the forming close. */}
        <line
          ref={tagLine}
          x1={PAD.left}
          x2={VIEW_W - PAD.right}
          stroke="#10b981"
          strokeOpacity="0.34"
          strokeWidth="1"
          strokeDasharray="2 5"
        />
        <g ref={tagGroup}>
          <rect
            x={VIEW_W - PAD.right + 4}
            y={-9}
            width={62}
            height={18}
            rx="4"
            fill="#10b981"
          />
          <text
            ref={tagText}
            x={VIEW_W - PAD.right + 35}
            y={4}
            textAnchor="middle"
            className="fill-[#04140e] font-mono text-[11px] font-semibold"
          >
            0.00
          </text>
        </g>
      </g>
    </svg>
  );
}

export { x as sceneX, y as sceneY, VIEW_W as SCENE_W, VIEW_H as SCENE_H };
