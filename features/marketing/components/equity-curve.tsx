"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import {
  EQUITY,
  EXPECTANCY_LABEL,
  MAX_DRAWDOWN_LABEL,
  NET_R_LABEL,
  PLAYBOOK_NAME,
  TRADE_COUNT,
  WIN_RATE,
} from "@/features/marketing/data/playbook";

/**
 * The equity curve.
 *
 * An area chart with a glow is the house style of every crypto landing page,
 * so the question was what to put under it. The answer is the one chart a
 * trader opens before any other: cumulative R across a playbook. It is also
 * the only one this product can honestly draw — SetupVault records R
 * multiples, so the curve is a running total of data it already holds, not an
 * invented price series.
 *
 * Fixed width and height rather than ResponsiveContainer, deliberately.
 * ResponsiveContainer measures the DOM, which means it renders nothing until
 * hydration — and this sits above the fold, where this project has already
 * shipped a blank hero three times. At fixed dimensions Recharts emits real
 * SVG on the server with a viewBox, and the wrapper below scales that SVG
 * with CSS. The chart is therefore visible in the HTML, before any JavaScript
 * runs; hydration only adds the hover readout.
 */

const WIDTH = 760;
const HEIGHT = 300;

interface Point {
  trade: number;
  r: number;
  delta: number;
}

function CurveTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const up = point.delta > 0;
  const scratch = point.delta === 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 shadow-floating backdrop-blur-xl",
        "border-black/[0.08] bg-white/80",
        "dark:border-white/[0.12] dark:bg-[#0d1119]/85",
      )}
    >
      <p className="text-[11px] text-fg-subtle">Trade {point.trade}</p>
      <p className="stat mt-1 text-[1.1rem] leading-none text-fg">
        {point.r > 0 ? "+" : ""}
        {point.r.toFixed(2)}R
      </p>
      {/* The sign is spelled out as well as coloured. This product's green and
          red are two and a half Delta E apart under deuteranopia, so colour
          alone does not carry meaning anywhere in it. */}
      <p
        className={cn(
          "numeric mt-1.5 text-[11.5px]",
          scratch ? "text-fg-subtle" : up ? "text-positive" : "text-negative",
        )}
      >
        {scratch
          ? "scratched"
          : `${up ? "won" : "lost"} ${Math.abs(point.delta).toFixed(1)}R`}
      </p>
    </div>
  );
}

export function EquityCurve({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  // Gradient and filter ids must be unique per instance or a second chart on
  // the page silently steals the first one's paint.
  const uid = useId().replace(/:/g, "");
  const fillId = `eq-fill-${uid}`;
  const lineId = `eq-line-${uid}`;
  const glowId = `eq-glow-${uid}`;

  return (
    <motion.div
      // Entrance only, and never from opacity 0: the markup must read if the
      // animation never arrives. It settles from a steeper tilt to a shallow
      // one, which matches the isometric language the rest of the page uses.
      initial={reduceMotion ? false : { opacity: 1, rotateX: 18, y: 14 }}
      whileInView={{ opacity: 1, rotateX: 6, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      style={{
        WebkitPerspective: "1400px",
        perspective: "1400px",
        willChange: "transform",
      }}
      className={cn(
        // Optical glass: translucent body, directional sheen, a one-pixel
        // specular line on the top edge and a contact shadow under a diffuse
        // one. The blur is what makes the translucency read as thickness
        // rather than as weak paint.
        "glass-card relative overflow-hidden rounded-2xl backdrop-blur-2xl",
        className,
      )}
    >
      {/* Header. Numbers, not adjectives. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-glass-border px-5 py-3.5">
        <p className="text-[12.5px] font-semibold tracking-tight text-fg">
          {PLAYBOOK_NAME}
        </p>
        <p className="numeric text-[11px] text-fg-subtle">
          {TRADE_COUNT} setups
        </p>
        <p className="stat ml-auto text-[15px] text-positive">{NET_R_LABEL}</p>
      </div>

      <div className="px-2 pt-3">
        {/* The fixed-size SVG, scaled by CSS. `h-auto` plus the viewBox
            Recharts writes is what makes a 760-wide chart fit a 340-wide
            phone without re-measuring anything at runtime. */}
        <div className="[&_.recharts-wrapper]:!h-auto [&_.recharts-wrapper]:!w-full [&_svg]:!h-auto [&_svg]:!w-full">
          <AreaChart
            width={WIDTH}
            height={HEIGHT}
            data={EQUITY as Point[]}
            margin={{ top: 8, right: 8, bottom: 0, left: 8 }}
          >
            <defs>
              {/* The glow: neon at the curve, gone by the baseline. */}
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.42} />
                <stop offset="45%" stopColor="var(--accent)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>

              {/* The stroke travels blue to green along its length, so the
                  line itself carries the direction of the curve. */}
              <linearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--positive)" />
              </linearGradient>

              <filter id={glowId} x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Horizontals only, and barely there — enough to read a level
                against, not enough to become a grid. */}
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 6"
              className="stroke-fg-subtle/15"
            />

            <XAxis dataKey="trade" hide />
            <YAxis domain={[0, "dataMax + 4"]} hide />

            <Tooltip
              content={<CurveTooltip />}
              cursor={{
                stroke: "var(--accent)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
            />

            <Area
              type="monotone"
              dataKey="r"
              stroke={`url(#${lineId})`}
              strokeWidth={2.25}
              fill={`url(#${fillId})`}
              filter={`url(#${glowId})`}
              // The dot on hover only. A dot on all sixty is a beaded
              // necklace, not a curve.
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--positive)",
                stroke: "var(--canvas)",
                strokeWidth: 2,
              }}
              isAnimationActive={!reduceMotion}
              animationDuration={1600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </div>
      </div>

      {/* The drawdown sits next to the total on purpose. A curve shown without
          it is the half of the story that sells, and a trader reads the
          missing half as a reason to distrust the rest. */}
      <dl className="grid grid-cols-3 gap-3 border-t border-glass-border px-5 py-3.5">
        {[
          { label: "Win rate", value: `${WIN_RATE}%` },
          { label: "Expectancy", value: EXPECTANCY_LABEL },
          // "Deepest drawdown" clipped at 390px, where three columns leave
          // about 110px each.
          { label: "Max drawdown", value: MAX_DRAWDOWN_LABEL },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="truncate text-[10.5px] text-fg-subtle">
              {item.label}
            </dt>
            <dd className="numeric mt-1 truncate text-[13.5px] font-semibold tracking-tight text-fg">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.div>
  );
}
