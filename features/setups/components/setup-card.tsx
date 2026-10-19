import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { formatRatio } from "@/lib/risk-reward";
import { ROUTES } from "@/lib/routes";
import { cn, formatDate } from "@/lib/utils";
import { MARKET_LABELS } from "@/features/setups/constants";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { toScoreInput } from "@/features/setup-score/utils/from-setup";
import { ScoreBadge } from "@/features/setup-score/components/score-badge";
import { FavoriteButton } from "@/features/setups/components/favorite-button";
import { CompareToggle } from "@/features/setups/components/compare-selection";
import type { SetupListItem } from "@/services/setups.service";

export function SetupCard({
  setup,
  userId,
  screenshotUrl,
}: {
  setup: SetupListItem;
  userId: string;
  screenshotUrl: string | null;
}) {
  const ratio = formatRatio(
    setup.risk_reward === null ? null : Number(setup.risk_reward),
  );
  const score = calculateSetupScore(toScoreInput(setup));

  return (
    <article className="group relative overflow-hidden rounded-xl border border-border bg-surface transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated">
      <Link
        href={`${ROUTES.setups}/${setup.id}`}
        className="block focus-visible:outline-none"
      >
        <div
          className={cn(
            "grid-surface relative w-full overflow-hidden bg-canvas-subtle",
            // 16:9 is the right shape for a chart, but at full width on a
            // phone one card then fills the screen and the library stops
            // being scannable — which is the whole job. The cap keeps the
            // ratio where there is room and trades it for density where
            // there is not.
            "aspect-video max-h-56 sm:max-h-64",
            // A setup with no screenshot has nothing to show, so it does not
            // get to claim the same height as one that has.
            screenshotUrl ? "" : "aspect-[16/7] max-h-32",
          )}
        >
          {screenshotUrl ? (
            <Image
              src={screenshotUrl}
              alt={`Chart saved with ${setup.title}`}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-fg-subtle">
              <ImageOff className="size-4" aria-hidden="true" />
              <span className="text-xs">No screenshot</span>
            </div>
          )}

          {/* Ticker and ratio ride on the image, the way they would on a chart. */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
            <span className="numeric text-xs font-medium text-white">
              {setup.ticker}
            </span>
            {ratio ? (
              <span className="numeric text-xs text-white/80">{ratio}</span>
            ) : null}
          </div>
        </div>

        <div className="p-4">
          <h3 className="truncate text-sm font-medium text-fg">{setup.title}</h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <DirectionBadge direction={setup.direction} />
            <ResultBadge result={setup.result} />
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-fg-subtle">
            <span className="truncate">
              {setup.strategy ?? MARKET_LABELS[setup.market]}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {score.scorable ? (
                <ScoreBadge score={score.score} grade={score.grade} />
              ) : null}
              {formatDate(setup.traded_on) ?? formatDate(setup.created_at)}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute left-2 top-2">
        <CompareToggle
          setupId={setup.id}
          title={setup.title}
          className="shadow-[0_2px_8px_-2px_rgb(0_0_0/0.5)]"
        />
      </div>

      <div className="absolute right-2 top-2">
        <FavoriteButton
          userId={userId}
          setupId={setup.id}
          isFavorite={setup.is_favorite}
          className="glass-strong backdrop-blur-2xl rounded-lg"
        />
      </div>
    </article>
  );
}
