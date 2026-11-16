import { cn } from "@/lib/utils";

/**
 * The platforms whose exports the importer reads, as a seamless loop.
 *
 * **On the branding.** These are wordmarks, not logos. The brief allows
 * official assets where they can be obtained and verified, and in this
 * environment neither is possible: the sandbox cannot reach the sites the
 * assets would come from, and a logo redrawn from memory is a logo invented
 * — the wrong shade, the wrong proportions, and a trademark used wrongly on
 * a commercial page. Clean type is the honest option the brief itself names,
 * and it is also the one that stays legible at 44px on a phone.
 *
 * **On the claim.** Every platform here is one the column mapper is tested
 * against, in `tests/import/mapper.ts`. cTrader was added to that suite
 * before it was added to this row: its export names the exit "Closing
 * price", the close "Closing time" and the P&L after the account currency,
 * and all three were being missed, so a file imported with no exit, no
 * close and no result. A marquee is a claim about what the product does,
 * and it should not be the first place a claim appears.
 *
 * It renders inside the import section, which is a client module, so this
 * markup is bundled with it — but it holds no state, no effect and no
 * handler. The loop is one CSS animation on one element, running off the
 * main thread, and the component is static markup either way.
 */

const PLATFORMS = [
  "TradingView",
  "MetaTrader 4",
  "MetaTrader 5",
  "Binance",
  "Bybit",
  "cTrader",
] as const;

function Card({ name }: { name: string }) {
  return (
    <div
      className={cn(
        // The spacing is a trailing margin rather than a gap on the track.
        // See the note in globals.css: a gap breaks the seam arithmetic.
        "mr-3 flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-2.5 sm:mr-4 sm:px-5 sm:py-3",
        "glass-note backdrop-blur-xl backdrop-saturate-150",
      )}
    >
      <span className="whitespace-nowrap text-[13px] font-semibold tracking-tight text-fg sm:text-[14px]">
        {name}
      </span>
      <span className="numeric rounded-full bg-accent-soft px-1.5 py-0.5 text-[9.5px] font-medium text-accent-on-soft">
        CSV
      </span>
    </div>
  );
}

function Group({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0" aria-hidden={hidden || undefined}>
      {PLATFORMS.map((name) => (
        <Card key={name} name={name} />
      ))}
    </div>
  );
}

export function PlatformMarquee({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="sv-marquee-viewport relative overflow-hidden"
        style={{
          // The row fades out rather than being cut off at the container
          // edge, so cards arrive and leave instead of appearing.
          maskImage:
            "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 7%, #000 93%, transparent)",
        }}
      >
        <div className="sv-marquee-track">
          <Group />
          {/* The second pass exists only to make the loop seamless, so it is
              hidden from assistive technology — otherwise the list of
              platforms is read out twice. */}
          <Group hidden />
        </div>
      </div>

      {/* Required, and true: nothing here is a partnership. */}
      <p className="mt-4 text-center text-[11.5px] leading-relaxed text-fg-subtle">
        Platform names are trademarks of their respective owners. SetupVault is
        not affiliated with, endorsed by, or partnered with any of them — it
        reads the CSV files they export.
      </p>
    </div>
  );
}
