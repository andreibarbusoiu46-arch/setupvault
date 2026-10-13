import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ImageOff, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatRatio } from "@/lib/risk-reward";
import { ROUTES } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { getSetupById } from "@/services/setups.service";
import { createScreenshotUrl } from "@/services/storage.service";
import { MARKET_LABELS } from "@/features/setups/constants";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import { getProfile } from "@/services/profile.service";
import { listAnalyses } from "@/services/ai-analysis.service";
import { isMockProvider } from "@/lib/ai";
import { AIPanel } from "@/features/ai/components/ai-panel";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { toScoreInput } from "@/features/setup-score/utils/from-setup";
import { ScorePanel } from "@/features/setup-score/components/score-panel";
import { DeleteSetupDialog } from "@/features/setups/components/delete-setup-dialog";
import { FavoriteButton } from "@/features/setups/components/favorite-button";

export const metadata: Metadata = { title: "Setup" };

function Level({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="px-4 py-4">
      <p className="eyebrow">{label}</p>
      <p
        className={`stat mt-2 text-lg leading-none ${
          value === "—"
            ? "text-fg-subtle"
            : tone === "positive"
              ? "text-positive"
              : tone === "negative"
                ? "text-negative"
                : "text-fg"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

const number = (value: number | null) =>
  value === null ? "—" : String(Number(value));

export default async function SetupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Scoped to the signed-in user, and RLS refuses the row regardless.
  const setup = await getSetupById(supabase, user.id, id);
  if (!setup) notFound();

  const screenshotUrl = await createScreenshotUrl(
    supabase,
    setup.screenshot_path,
  );
  const ratio = formatRatio(
    setup.risk_reward === null ? null : Number(setup.risk_reward),
  );

  // Derived on every render rather than stored: deterministic and cheap.
  const score = calculateSetupScore(toScoreInput(setup));

  const [profile, analyses] = await Promise.all([
    getProfile(supabase, user.id),
    listAnalyses(supabase, user.id, setup.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ROUTES.setups}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to my setups
        </Link>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl">
                {setup.title}
              </h2>
              <FavoriteButton
                userId={user.id}
                setupId={setup.id}
                isFavorite={setup.is_favorite}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant="accent" className="numeric">
                {setup.ticker}
              </Badge>
              <DirectionBadge direction={setup.direction} />
              <Badge>{MARKET_LABELS[setup.market]}</Badge>
              <ResultBadge result={setup.result} />
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`${ROUTES.setups}/${setup.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </Button>
            <DeleteSetupDialog
              userId={user.id}
              setupId={setup.id}
              title={setup.title}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card glass className="overflow-hidden p-0">
            {screenshotUrl ? (
              <div className="relative aspect-video w-full bg-canvas-subtle">
                <Image
                  src={screenshotUrl}
                  alt={`Chart saved with ${setup.title}`}
                  fill
                  unoptimized
                  priority
                  sizes="(max-width: 1024px) 100vw, 760px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-canvas-subtle text-fg-subtle">
                <ImageOff className="size-5" aria-hidden="true" />
                <p className="text-sm">No screenshot on this setup</p>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`${ROUTES.setups}/${setup.id}/edit`}>
                    Add one
                  </Link>
                </Button>
              </div>
            )}
          </Card>

          <AIPanel
            setupId={setup.id}
            userId={user.id}
            tier={profile?.subscription_tier ?? "free"}
            direction={setup.direction}
            hasScreenshot={Boolean(setup.screenshot_path)}
            existingTags={setup.tags}
            latest={analyses[0] ?? null}
            historyCount={analyses.length}
            usingMock={isMockProvider()}
          />

          {setup.notes ? (
            <Card className="p-5">
              <h3 className="text-sm font-medium text-fg">Notes</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
                {setup.notes}
              </p>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <Card glass className="overflow-hidden p-0">
            <div className="grid grid-cols-2 divide-x divide-y divide-border">
              <Level label="Entry" value={number(setup.entry)} />
              <Level
                label="Stop loss"
                value={number(setup.stop_loss)}
                tone="negative"
              />
              <Level
                label="Take profit"
                value={number(setup.take_profit)}
                tone="positive"
              />
              <Level label="Risk to reward" value={ratio ?? "—"} />
            </div>
            <div className="border-t border-border px-4 py-2.5">
              <p className="text-xs text-fg-subtle">
                {ratio
                  ? "Ratio derived from the levels above."
                  : "Add entry, stop and target to get a ratio."}
              </p>
            </div>
          </Card>

          <ScorePanel result={score} />

          <Card className="p-5">
            <dl className="flex flex-col gap-4">
              <div>
                <dt className="text-xs text-fg-subtle">Strategy</dt>
                <dd className="mt-1 text-sm text-fg">
                  {setup.strategy ?? "Not recorded"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-fg-subtle">Taken on</dt>
                <dd className="mt-1 text-sm text-fg">
                  {formatDate(setup.traded_on) ?? "Not recorded"}
                  {setup.traded_at ? (
                    <span className="numeric ml-2 text-fg-muted">
                      {setup.traded_at.slice(0, 5)}
                    </span>
                  ) : null}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-fg-subtle">Tags</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {setup.tags.length > 0 ? (
                    setup.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)
                  ) : (
                    <span className="text-sm text-fg-muted">No tags</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <p className="px-1 text-xs leading-relaxed text-fg-subtle">
            Saved {formatRelativeTime(setup.created_at)}
            {setup.updated_at !== setup.created_at
              ? ` · edited ${formatRelativeTime(setup.updated_at)}`
              : null}
          </p>
        </div>
      </div>
    </div>
  );
}
