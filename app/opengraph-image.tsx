import { ImageResponse } from "next/og";

/**
 * The share card.
 *
 * Without this, every link to the site — in a Discord trading room, a
 * WhatsApp message to a friend, a tweet — renders as a bare grey rectangle,
 * which is where most of the first impressions of a new product are lost.
 *
 * It repeats the page's own device rather than inventing a second one: the
 * price ladder down the left, the live price tagged in blue, and the headline
 * set tight beside it. Drawn with plain boxes because the renderer here
 * supports flexbox and little else — no custom font is fetched, so the card
 * builds even when the font host is unreachable.
 */

export const alt =
  "SetupVault — the searchable library for your own trading setups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS = "#07090f";
const FG = "#f3f5f9";
const MUTED = "#a2aaba";
const SUBTLE = "#737c8e";
const ACCENT = "#4d8bf8";
const POSITIVE = "#19c08a";
const NEGATIVE = "#fb7185";
const LINE = "rgba(255,255,255,0.10)";

/** Candle heights and direction, shaped like the hero's own series. */
const CANDLES = [
  { height: 46, up: false },
  { height: 58, up: false },
  { height: 34, up: true },
  { height: 70, up: true },
  { height: 88, up: true },
  { height: 104, up: true },
  { height: 124, up: true },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <div style={{ width: 7, height: 22, background: ACCENT, borderRadius: 2 }} />
            <div style={{ width: 7, height: 34, background: ACCENT, borderRadius: 2 }} />
            <div style={{ width: 7, height: 16, background: POSITIVE, borderRadius: 2 }} />
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, letterSpacing: -0.8 }}>
            <span style={{ color: FG }}>Setup</span>
            <span style={{ color: ACCENT }}>Vault</span>
          </div>
        </div>

        {/* Headline beside the ladder */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 30 }}>
          {/* The price scale, exactly as the hero draws it */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "flex-end",
              borderRight: `1px solid ${LINE}`,
              paddingRight: 14,
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: SUBTLE }}>20450</div>
            <div
              style={{
                display: "flex",
                fontSize: 18,
                fontWeight: 600,
                color: "#07101f",
                background: ACCENT,
                borderRadius: 5,
                padding: "5px 9px",
                marginRight: -15,
              }}
            >
              20418
            </div>
            <div style={{ display: "flex", fontSize: 18, color: SUBTLE }}>20386</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 60,
                fontWeight: 700,
                color: FG,
                letterSpacing: -3,
                lineHeight: 1.04,
              }}
            >
              <span>Stop guessing.</span>
              <span>Start building your edge.</span>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 25,
                color: MUTED,
                lineHeight: 1.4,
                maxWidth: 620,
              }}
            >
              Every setup you take, with the chart and the thesis — searchable
              months later.
            </div>
          </div>
        </div>

        {/* Footer: the candles on the right, the claim on the left */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 21, color: SUBTLE }}>
            Private by construction. Nothing connects to your broker.
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", height: 120, gap: 11 }}>
            {CANDLES.map((candle, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  width: 13,
                  height: candle.height,
                  background: candle.up ? POSITIVE : NEGATIVE,
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
