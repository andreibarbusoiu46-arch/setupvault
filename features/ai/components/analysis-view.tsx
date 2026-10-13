import { cn } from "@/lib/utils";
import type { SetupAnalysis } from "@/features/ai/schemas";

const ASSESSMENT_TONE: Record<string, string> = {
  good: "text-positive",
  acceptable: "text-fg",
  weak: "text-negative",
  unclear: "text-fg-subtle",
  likely: "text-fg",
  possible: "text-fg-muted",
  absent: "text-fg-subtle",
};

const ASSESSMENT_LABEL: Record<string, string> = {
  good: "Good",
  acceptable: "Acceptable",
  weak: "Weak",
  unclear: "Unclear",
  likely: "Likely",
  possible: "Possible",
  absent: "Not seen",
};

function Row({
  label,
  status,
  explanation,
  confidence,
}: {
  label: string;
  status: string;
  explanation: string;
  confidence: number;
}) {
  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-fg-muted">{label}</span>
        <span className="flex items-center gap-2.5">
          <span className={cn("text-sm", ASSESSMENT_TONE[status] ?? "text-fg")}>
            {ASSESSMENT_LABEL[status] ?? status}
          </span>
          <span className="numeric text-xs text-fg-subtle">
            {Math.round(confidence * 100)}%
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">{explanation}</p>
    </div>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-fg-muted">
            <span
              className="mt-1.5 size-1 shrink-0 rounded-full bg-fg-subtle"
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Renders a validated analysis. Every claim carries its own confidence. */
export function AnalysisView({ analysis }: { analysis: SetupAnalysis }) {
  return (
    <div className="flex flex-col">
      <p className="px-5 pb-4 text-sm leading-relaxed text-fg">
        {analysis.overallAssessment}
      </p>

      <div className="divide-y divide-border border-y border-border">
        <Row label="Entry" {...analysis.entryQuality} status={analysis.entryQuality.assessment} />
        <Row label="Stop loss" {...analysis.stopLossQuality} status={analysis.stopLossQuality.assessment} />
        <Row label="Take profit" {...analysis.takeProfitQuality} status={analysis.takeProfitQuality.assessment} />
        <Row label="Risk / reward" {...analysis.riskRewardAssessment} status={analysis.riskRewardAssessment.assessment} />
        <Row label="Market structure" {...analysis.marketStructure} />
        <Row label="Liquidity" {...analysis.liquidityAnalysis} />
        <Row label="Support / resistance" {...analysis.supportResistance} />
      </div>

      {analysis.detectedPatterns.length > 0 ? (
        <div className="border-b border-border px-5 py-4">
          <p className="eyebrow">Patterns the model thinks it can see</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {analysis.detectedPatterns.map((pattern) => (
              <li
                key={pattern.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted"
              >
                {pattern.name}
                <span className="text-fg-subtle">
                  {ASSESSMENT_LABEL[pattern.status] ?? pattern.status}
                </span>
                <span className="numeric text-fg-subtle">
                  {Math.round(pattern.confidence * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 p-5 sm:grid-cols-2">
        <Bullets title="Strengths" items={analysis.strengths} />
        <Bullets title="Weaknesses" items={analysis.weaknesses} />
        <Bullets title="Confluences" items={analysis.confluences} />
        <Bullets title="What to improve" items={analysis.improvementSuggestions} />
      </div>

      {analysis.uncertainty.length > 0 ? (
        <div className="border-t border-border px-5 py-4">
          <Bullets title="What it could not determine" items={analysis.uncertainty} />
        </div>
      ) : null}

      <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-fg-subtle">
        An analysis of how this setup was documented and executed. It is not a
        trading signal, not advice, and says nothing about what price will do
        next. Overall confidence {Math.round(analysis.confidence * 100)}%.
      </p>
    </div>
  );
}
