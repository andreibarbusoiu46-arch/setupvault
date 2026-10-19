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
import type { SetupListItem } from "@/services/setups.service";

/**
 * The library at scanning density.
 *
 * The card is for browsing — "which one looked like this?" — and it answers
 * that by showing the chart big. This is for the other question, the one that
 * arrives once there are three hundred setups: "show me every EURUSD
 * breakout I took in March". That is a reading task, and reading wants rows:
 * the same field in the same column on every line, so the eye runs down one
 * column instead of hunting around each card.
 *
 * The screenshot survives as a thumbnail because recognising your own chart
 * is faster than reading your own title — but at a size that costs one line,
 * not one screen.
 */
export function SetupRow({
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
    <article className="group relative">
      <Link
        href={`${ROUTES.setups}/${setup.id}`}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 sm:gap-4 sm:px-4",
          "transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "[@media(hover:hover)and(pointer:fine)]:hover:border-border-strong",
          "[@media(hover:hover)and(pointer:fine)]:hover:bg-surface-hover",
          "active:scale-[0.995] active:bg-surface-hover",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
        )}
      >
        {/* The thumbnail keeps the chart's own 16:9 so it reads as a chart
            rather than an avatar. */}
        <div className="grid-surface relative aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-canvas-subtle sm:w-20">
          {screenshotUrl ? (
            <Image
              src={screenshotUrl}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-fg-subtle">
              <ImageOff className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{setup.title}</p>
          <p className="mt-1 flex items-center gap-2 truncate text-xs text-fg-subtle">
            <span className="numeric shrink-0 text-fg-muted">{setup.ticker}</span>
            <DirectionBadge direction={setup.direction} variant="text" />
            <span className="truncate">
              {setup.strategy ?? MARKET_LABELS[setup.market]}
            </span>
          </p>
        </div>

        {/* Fixed columns from here right, so the numbers line up down the
            list instead of drifting with the title length. */}
        <span className="numeric hidden w-14 shrink-0 text-right text-xs text-fg-muted sm:block">
          {ratio ?? "—"}
        </span>

        <span className="hidden w-24 shrink-0 text-right text-xs text-fg-subtle md:block">
          {formatDate(setup.traded_on) ?? formatDate(setup.created_at)}
        </span>

        <span className="flex shrink-0 items-center gap-2">
          {score.scorable ? (
            <ScoreBadge score={score.score} grade={score.grade} />
          ) : null}
          <ResultBadge result={setup.result} />
        </span>
      </Link>

      {/* Outside the link, so starring a setup never navigates to it. */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100 max-sm:hidden">
        <FavoriteButton
          setupId={setup.id}
          userId={userId}
          isFavorite={setup.is_favorite}
        />
      </div>
    </article>
  );
}
