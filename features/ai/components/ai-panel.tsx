"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Sparkles, Tags, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { canUseFeature } from "@/lib/feature-access";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { updateSetup } from "@/services/setups.service";
import { setupAnalysisSchema, type SetupAnalysis, type SuggestedTag } from "@/features/ai/schemas";
import { AnalysisView } from "@/features/ai/components/analysis-view";
import { LockedFeature } from "@/features/ai/components/locked-feature";
import type { OcrLevels } from "@/features/ai/schemas";
import type { AIAnalysisRow, SubscriptionTier, TradeDirection } from "@/types/database";

interface AIPanelProps {
  setupId: string;
  userId: string;
  tier: SubscriptionTier;
  direction: TradeDirection;
  hasScreenshot: boolean;
  existingTags: string[];
  latest: AIAnalysisRow | null;
  historyCount: number;
  /** True when the server is running the development mock provider. */
  usingMock: boolean;
}

type OcrResponse = {
  levels: OcrLevels;
  review: { usable: boolean; reason: string | null };
};

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "Something went wrong. Try again in a moment.",
    );
  }

  return payload;
}

export function AIPanel({
  setupId,
  userId,
  tier,
  direction,
  hasScreenshot,
  existingTags,
  latest,
  historyCount,
  usingMock,
}: AIPanelProps) {
  const router = useRouter();

  const [analysis, setAnalysis] = useState<SetupAnalysis | null>(() => {
    if (!latest?.result_json) return null;
    // Stored output is re-validated on read: the schema may have moved on
    // since the row was written.
    const parsed = setupAnalysisSchema.safeParse(latest.result_json);
    return parsed.success ? parsed.data : null;
  });

  const [analyzedAt, setAnalyzedAt] = useState<string | null>(
    latest?.created_at ?? null,
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tagging, setTagging] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTag[] | null>(null);

  const [reading, setReading] = useState(false);
  const [ocr, setOcr] = useState<OcrResponse | null>(null);

  const canTag = canUseFeature(tier, "ai_auto_tagging");
  const canOcr = canUseFeature(tier, "ai_ocr");

  const analyze = async (force: boolean) => {
    setRunning(true);
    setError(null);

    try {
      const payload = await postJson("/api/ai/analyze", { setupId, force });
      const row = payload?.analysis as AIAnalysisRow | undefined;
      const parsed = setupAnalysisSchema.safeParse(row?.result_json);

      if (!parsed.success) {
        setError("The analysis came back in an unexpected shape.");
        return;
      }

      setAnalysis(parsed.data);
      setAnalyzedAt(row?.created_at ?? new Date().toISOString());
      if (payload?.cached === true) toast.success("Showing the existing analysis");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  };

  const suggestTags = async () => {
    setTagging(true);
    try {
      const payload = await postJson("/api/ai/tags", { setupId });
      setSuggestions((payload?.tags as SuggestedTag[]) ?? []);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Tagging failed.");
    } finally {
      setTagging(false);
    }
  };

  // Accepting a tag goes through the normal setup update path, so the write is
  // the user's own action under their own RLS policy — the AI never writes.
  const acceptTag = async (tag: string) => {
    try {
      await updateSetup(createClient(), userId, setupId, {
        tags: [...existingTags, tag],
      });
      setSuggestions((current) => current?.filter((item) => item.tag !== tag) ?? null);
      toast.success(`Added “${tag}”`);
      router.refresh();
    } catch {
      toast.error("That tag could not be saved.");
    }
  };

  const readLevels = async () => {
    setReading(true);
    try {
      const payload = await postJson("/api/ai/ocr", { setupId });
      setOcr(payload as unknown as OcrResponse);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Reading failed.");
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card glass className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-glass backdrop-blur-xl-border p-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            <div>
              <h3 className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                AI setup analysis
                {usingMock ? (
                  <span className="rounded-full border border-negative/40 bg-negative-soft px-2 py-0.5 text-xs font-normal text-negative">
                    Mock provider — not real AI
                  </span>
                ) : null}
              </h3>
              <p className="mt-0.5 text-xs text-fg-muted">
                {analyzedAt
                  ? `Last run ${formatRelativeTime(analyzedAt)}${
                      historyCount > 1 ? ` · ${historyCount} runs` : ""
                    }`
                  : hasScreenshot
                    ? "Reads your chart and the setup data"
                    : "No screenshot on this setup, so it reads the data only"}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant={analysis ? "secondary" : "primary"}
            disabled={running}
            onClick={() => void analyze(Boolean(analysis))}
          >
            {running ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Analyzing
              </>
            ) : analysis ? (
              <>
                <RefreshCw aria-hidden="true" />
                Re-analyze
              </>
            ) : (
              "Analyze with AI"
            )}
          </Button>
        </div>

        {running ? (
          <p
            className="px-5 py-8 text-center text-sm text-fg-muted"
            role="status"
            aria-live="polite"
          >
            Waiting for the analysis. This usually takes twenty to forty seconds
            {hasScreenshot ? ", longer with a chart attached" : ""}.
          </p>
        ) : error ? (
          <div className="p-5">
            <Alert>{error}</Alert>
          </div>
        ) : analysis ? (
          <>
            {usingMock ? (
              <p className="border-b border-border bg-negative-soft px-5 py-2.5 text-xs leading-relaxed text-fg">
                Generated by the development mock provider. No model read this
                setup, and nothing below is a real assessment.
              </p>
            ) : null}
            <AnalysisView analysis={analysis} />
          </>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-fg-subtle">
            Nothing analysed yet.
          </p>
        )}
      </Card>

      {canTag ? (
        <Card glass className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Tags className="size-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-medium text-fg">Suggested tags</h3>
            </div>
            <Button size="sm" variant="secondary" disabled={tagging} onClick={() => void suggestTags()}>
              {tagging ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Reading
                </>
              ) : (
                "Suggest tags"
              )}
            </Button>
          </div>

          {suggestions === null ? (
            <p className="mt-4 text-xs text-fg-subtle">
              Suggestions only. Nothing is added until you accept it.
            </p>
          ) : suggestions.length === 0 ? (
            <p className="mt-4 text-sm text-fg-subtle">
              No new tags suggested.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {suggestions.map((item) => (
                <li
                  key={item.tag}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="text-sm text-fg">{item.tag}</span>
                    <span className="numeric ml-2 text-xs text-fg-subtle">
                      {Math.round(item.confidence * 100)}%
                    </span>
                    {item.rationale ? (
                      <span className="mt-0.5 block text-xs text-fg-subtle">
                        {item.rationale}
                      </span>
                    ) : null}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => void acceptTag(item.tag)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setSuggestions((current) =>
                        current?.filter((entry) => entry.tag !== item.tag) ?? null,
                      )
                    }
                  >
                    Reject
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <LockedFeature feature="ai_auto_tagging" />
      )}

      {!canOcr ? (
        <LockedFeature feature="ai_ocr" />
      ) : hasScreenshot ? (
        <Card glass className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Wand2 className="size-4 text-accent" aria-hidden="true" />
              <h3 className="text-sm font-medium text-fg">Read levels from chart</h3>
            </div>
            <Button size="sm" variant="secondary" disabled={reading} onClick={() => void readLevels()}>
              {reading ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden="true" />
                  Reading
                </>
              ) : (
                "Read levels"
              )}
            </Button>
          </div>

          {ocr ? (
            ocr.review.usable ? (
              <div className="mt-4">
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Entry", value: ocr.levels.entry },
                    { label: "Stop loss", value: ocr.levels.stopLoss },
                    { label: "Take profit", value: ocr.levels.takeProfit },
                  ].map((level) => (
                    <div key={level.label} className="rounded-lg border border-border p-3">
                      <dt className="eyebrow">{level.label}</dt>
                      <dd className="numeric mt-1 text-sm text-fg">
                        {level.value ?? "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs text-fg-subtle">
                  Checked against a {direction} setup. Copy them into the edit
                  form if they look right — nothing is changed automatically.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <Alert>{ocr.review.reason ?? "The reading was not usable."}</Alert>
              </div>
            )
          ) : (
            <p className="mt-4 text-xs text-fg-subtle">
              Reads price levels marked on the chart. Suggestions only.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
