import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ImageOff } from "lucide-react";

import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatRatio } from "@/lib/risk-reward";
import { ROUTES } from "@/lib/routes";
import { cn, formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createScreenshotUrl } from "@/services/storage.service";
import { getSetupById } from "@/services/setups.service";
import { MARKET_LABELS } from "@/features/setups/constants";
import {
  DirectionBadge,
  ResultBadge,
} from "@/features/setups/components/setup-badges";
import { calculateSetupScore } from "@/features/setup-score/utils/score";
import { toScoreInput } from "@/features/setup-score/utils/from-setup";
import { ScoreBadge } from "@/features/setup-score/components/score-badge";
import type { SetupRow } from "@/types/database";

export const metadata: Metadata = { title: "Compare" };

/**
 * Two setups, one row per field.
 *
 * The thing that makes a comparison work is alignment: every field sits on
 * the same line for both setups, so the eye runs across one row rather than
 * reading two cards and holding one in memory. Two independent panels side by
 * side look like a comparison and are not one.
 *
 * Where a field has a better and a worse side, the better one is marked — but
 * never by colour alone, because this product's green and red are two and a
 * half Delta E apart under deuteranopia. The marker is a word.
 */

type Side = "a" | "b" | null;

/** Higher wins. Returns null when they tie or either is missing. */
function better(a: number | null, b: number | null): Side {
  if (a === null || b === null || a === b) return null;
  return a > b ? "a" : "b";
}

const RESULT_RANK: Record<SetupRow["result"], number | null> = {
  win: 2,
  breakeven: 1,
  loss: 0,
  pending: null,
};

function Figure({
  value,
  highlight,
  mono = true,
}: {
  value: React.ReactNode;
  highlight: boolean;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          mono && "numeric",
          "truncate text-[15px]",
          highlight ? "font-semibold text-fg" : "text-fg-muted",
        )}
      >
        {value}
      </p>
      {highlight ? (
        <p className="mt-0.5 text-[11px] text-accent">better</p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  a,
  b,
  winner = null,
}: {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  winner?: Side;
}) {
  return (
    <div className="border-t border-border px-5 py-3.5 first:border-t-0">
      <p className="eyebrow">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-4">
        <Figure value={a} highlight={winner === "a"} />
        <Figure value={b} highlight={winner === "b"} />
      </div>
    </div>
  );
}

function Shot({
  url,
  title,
  meta,
}: {
  url: string | null;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="grid-surface relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-canvas-subtle">
        {url ? (
          <Image src={url} alt="" fill sizes="(min-width: 640px) 45vw, 90vw" className="object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-fg-subtle">
            <ImageOff className="size-4" aria-hidden="true" />
            <span className="text-[11px]">No screenshot</span>
          </span>
        )}
      </div>
      <h2 className="mt-3 truncate text-[15px] font-medium tracking-tight text-fg">
        {title}
      </h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a: idA, b: idB } = await searchParams;
  if (!idA || !idB) redirect(ROUTES.setups);
  if (idA === idB) redirect(ROUTES.setups);

  const user = await requireUser();
  const supabase = await createClient();

  // Both scoped to the signed-in user, and Row Level Security refuses the row
  // regardless of what the query string asks for.
  const [a, b] = await Promise.all([
    getSetupById(supabase, user.id, idA),
    getSetupById(supabase, user.id, idB),
  ]);
  if (!a || !b) notFound();

  const [shotA, shotB] = await Promise.all([
    createScreenshotUrl(supabase, a.screenshot_path),
    createScreenshotUrl(supabase, b.screenshot_path),
  ]);

  const scoreA = calculateSetupScore(toScoreInput(a));
  const scoreB = calculateSetupScore(toScoreInput(b));

  const rrA = a.risk_reward === null ? null : Number(a.risk_reward);
  const rrB = b.risk_reward === null ? null : Number(b.risk_reward);

  const num = (value: number | null) => (value === null ? "—" : String(Number(value)));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ROUTES.setups}
          className="inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to my setups
        </Link>

        <h1 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-fg sm:text-3xl">
          Side by side
        </h1>
        <p className="mt-2 max-w-prose text-sm text-fg-muted">
          The same field on the same line for both, so the difference is the
          thing you read rather than something you have to work out.
        </p>
      </div>

      <Card glass className="overflow-hidden backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-4 px-5 pb-5 pt-5">
          <Shot
            url={shotA}
            title={a.title}
            meta={
              <>
                <DirectionBadge direction={a.direction} />
                <ResultBadge result={a.result} />
              </>
            }
          />
          <Shot
            url={shotB}
            title={b.title}
            meta={
              <>
                <DirectionBadge direction={b.direction} />
                <ResultBadge result={b.result} />
              </>
            }
          />
        </div>

        <Field
          label="Market"
          a={`${a.ticker} · ${MARKET_LABELS[a.market]}`}
          b={`${b.ticker} · ${MARKET_LABELS[b.market]}`}
        />

        <Field
          label="Strategy"
          a={a.strategy ?? "—"}
          b={b.strategy ?? "—"}
        />

        <Field
          label="Risk to reward"
          a={formatRatio(rrA) ?? "—"}
          b={formatRatio(rrB) ?? "—"}
          winner={better(rrA, rrB)}
        />

        <Field
          label="Setup score"
          a={
            scoreA.scorable ? (
              <ScoreBadge score={scoreA.score} grade={scoreA.grade} />
            ) : (
              "Not scorable"
            )
          }
          b={
            scoreB.scorable ? (
              <ScoreBadge score={scoreB.score} grade={scoreB.grade} />
            ) : (
              "Not scorable"
            )
          }
          winner={better(
            scoreA.scorable ? scoreA.score : null,
            scoreB.scorable ? scoreB.score : null,
          )}
        />

        <Field
          label="Result"
          a={<ResultBadge result={a.result} />}
          b={<ResultBadge result={b.result} />}
          winner={better(RESULT_RANK[a.result], RESULT_RANK[b.result])}
        />

        <Field label="Entry" a={num(a.entry)} b={num(b.entry)} />
        <Field label="Stop loss" a={num(a.stop_loss)} b={num(b.stop_loss)} />
        <Field label="Take profit" a={num(a.take_profit)} b={num(b.take_profit)} />

        <Field
          label="Traded"
          a={formatDate(a.traded_on) ?? formatDate(a.created_at) ?? "—"}
          b={formatDate(b.traded_on) ?? formatDate(b.created_at) ?? "—"}
        />

        <Field
          label="Tags"
          a={a.tags.length ? a.tags.join(", ") : "—"}
          b={b.tags.length ? b.tags.join(", ") : "—"}
        />
      </Card>

      {/* The notes are prose, so they get width rather than a shared line. */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[a, b].map((setup) => (
          <Card key={setup.id} glass className="p-5 backdrop-blur-xl">
            <p className="eyebrow">Notes — {setup.title}</p>
            <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
              {setup.notes?.trim() || "Nothing written down."}
            </p>
            <Link
              href={`${ROUTES.setups}/${setup.id}`}
              className="mt-4 inline-flex text-sm text-accent transition-opacity duration-150 hover:opacity-80"
            >
              Open this setup
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
