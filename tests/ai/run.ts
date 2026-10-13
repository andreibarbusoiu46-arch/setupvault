// Run with: npm run test:ai
// No network, no API key, no cost — everything goes through MockAIProvider.
import { MockAIProvider } from "../../lib/ai/mock.ts";
import {
  ocrLevelsSchema, semanticQuerySchema, setupAnalysisSchema,
  suggestedTagsSchema, scoreExplanationSchema,
} from "../../features/ai/schemas.ts";
import { reviewOcrLevels } from "../../features/ai/utils/ocr-validation.ts";
import { buildInputHash } from "../../features/ai/utils/input-hash.ts";
import { extractJson } from "../../lib/ai/json.ts";
import { canUseFeature, requiredTier, tierLimit } from "../../lib/feature-access/index.ts";

let fails = 0;
const check = (n: string, a: unknown, e: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : ` (got ${JSON.stringify(a)?.slice(0,120)})`}`);
};
const yes = (n: string, c: boolean) => check(n, c, true);

process.env.AI_MOCK_DELAY_MS = "0";
const mock = new MockAIProvider();

const LONG_SETUP = `Ticker: EURUSD
Market: forex
Direction: long
Date: 2026-03-10
Entry: 1.084
Stop loss: 1.079
Take profit: 1.099
Risk to reward: 3
Result: win
Strategy: Liquidity sweep
Tags: fvg
Title: London sweep
Notes: Took it after the sweep.`;

const SHORT_SETUP = LONG_SETUP.replace("Direction: long", "Direction: short");
const BARE_SETUP = `Ticker: BTCUSD
Market: crypto
Direction: short
Date: not recorded
Entry: not recorded
Stop loss: not recorded
Take profit: not recorded
Risk to reward: not recorded
Result: pending
Strategy: not recorded
Tags: none
Title: Untitled
Notes: none`;

const img = { mediaType: "image/png" as const, data: "AAAA" };
const run = <T,>(intent: never, schema: unknown, content: string, image?: unknown) =>
  mock.complete({ intent, systemPrompt: "s", userContent: content, schema, image } as never) as Promise<{ data: T; model: string; mock?: boolean }>;

// --- every intent produces schema-valid output ---
const analysis = await run<Record<string, never>>("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP, img);
yes("mock analysis passes the real schema", setupAnalysisSchema.safeParse(analysis.data).success);
check("mock flagged as mock", analysis.mock, true);
check("mock model name is honest", analysis.model, "mock-provider");

const tags = await run("auto_tagging" as never, suggestedTagsSchema, LONG_SETUP, img);
yes("mock tags pass schema", suggestedTagsSchema.safeParse(tags.data).success);
const ocr = await run("ocr_levels" as never, ocrLevelsSchema, LONG_SETUP, img);
yes("mock OCR passes schema", ocrLevelsSchema.safeParse(ocr.data).success);
const search = await run("semantic_search" as never, semanticQuerySchema, "Show me losing long setups from last month where I entered too early after a liquidity sweep");
yes("mock semantic query passes schema", semanticQuerySchema.safeParse(search.data).success);
const expl = await run("score_explanation" as never, scoreExplanationSchema, LONG_SETUP);
yes("mock score explanation passes schema", scoreExplanationSchema.safeParse(expl.data).success);

// --- output is derived from the setup, not canned ---
const a = analysis.data as Record<string, { assessment?: string; explanation?: string; status?: string }>;
yes("RR 3 rated good", a.riskRewardAssessment.assessment === "good");
yes("explanation quotes the real ratio", String(a.riskRewardAssessment.explanation).includes("3"));

const weak = await run("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP.replace("Risk to reward: 3", "Risk to reward: 0.7"), img);
check("RR 0.7 rated weak", (weak.data as never as Record<string, {assessment:string}>).riskRewardAssessment.assessment, "weak");

// --- no screenshot must not produce visual claims ---
const noImage = await run("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP);
const n = noImage.data as never as Record<string, { status?: string }> & { detectedPatterns: unknown[]; uncertainty: string[] };
check("no image -> market structure unclear", n.marketStructure.status, "unclear");
check("no image -> liquidity unclear", n.liquidityAnalysis.status, "unclear");
check("no image -> support/resistance unclear", n.supportResistance.status, "unclear");
check("no image -> no patterns claimed", n.detectedPatterns.length, 0);
yes("no image -> says so in uncertainty", n.uncertainty.some((u) => u.toLowerCase().includes("no chart")));
yes("with image -> patterns are possible/unclear only",
  (analysis.data as never as {detectedPatterns:{status:string}[]}).detectedPatterns.every((p) => ["possible","unclear","likely","absent"].includes(p.status)));

// --- empty setup degrades honestly ---
const bare = await run("setup_analysis" as never, setupAnalysisSchema, BARE_SETUP);
const b = bare.data as never as Record<string, {assessment:string}>;
check("missing entry -> unclear", b.entryQuality.assessment, "unclear");
check("missing stop -> unclear", b.stopLossQuality.assessment, "unclear");
check("missing RR -> unclear", b.riskRewardAssessment.assessment, "unclear");

// --- OCR geometry matches direction, both ways ---
const longOcr = ocrLevelsSchema.parse(ocr.data);
check("mock long OCR is usable", reviewOcrLevels(longOcr, "long").usable, true);
const shortOcrRaw = await run("ocr_levels" as never, ocrLevelsSchema, SHORT_SETUP, img);
const shortOcr = ocrLevelsSchema.parse(shortOcrRaw.data);
check("mock short OCR is usable", reviewOcrLevels(shortOcr, "short").usable, true);
check("long levels refused for a short", reviewOcrLevels(longOcr, "short").usable, false);

// --- semantic parsing reads the sentence ---
const q = search.data as never as Record<string, unknown>;
check("parsed direction", q.direction, "long");
check("parsed result", q.result, "loss");
check("parsed range", q.range, "30d");
check("parsed intent", q.semanticIntent, "early entry");
const q2 = (await run("semantic_search" as never, semanticQuerySchema, "my starred crypto wins")).data as never as Record<string, unknown>;
check("parsed favourites", q2.favorites, "only");
check("parsed market", q2.market, "crypto");
check("parsed win", q2.result, "win");

// --- failure injection reaches the error paths ---
for (const [mode, code] of [["timeout","timeout"],["rate_limited","rate_limited"],["provider_error","provider_error"],["unauthorized","unauthorized"],["invalid_output","invalid_output"]] as const) {
  process.env.AI_MOCK_FAILURE = mode;
  let caught = "none";
  try { await run("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP); }
  catch (e) { caught = (e as {code?:string}).code ?? "none"; }
  check(`failure mode ${mode} surfaces ${code}`, caught, code);
}

process.env.AI_MOCK_FAILURE = "ocr_mismatch";
const bad = ocrLevelsSchema.parse((await run("ocr_levels" as never, ocrLevelsSchema, LONG_SETUP, img)).data);
check("ocr_mismatch is refused by validation", reviewOcrLevels(bad, "long").usable, false);
process.env.AI_MOCK_FAILURE = "ocr_ambiguous";
const amb = ocrLevelsSchema.parse((await run("ocr_levels" as never, ocrLevelsSchema, LONG_SETUP, img)).data);
check("ocr_ambiguous is refused by validation", reviewOcrLevels(amb, "long").usable, false);
delete process.env.AI_MOCK_FAILURE;

// --- determinism, so a cached hash is meaningful ---
const r1 = await run("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP, img);
const r2 = await run("setup_analysis" as never, setupAnalysisSchema, LONG_SETUP, img);
check("mock is deterministic for identical input", JSON.stringify(r1.data), JSON.stringify(r2.data));
yes("different setups give different output", JSON.stringify(r1.data) !== JSON.stringify(bare.data));

// --- hashing drives the cache ---
const h = { ticker: "EURUSD", entry: 1, tags: ["x"] };
check("hash stable under key order", buildInputHash(h), buildInputHash({ tags: ["x"], entry: 1, ticker: "EURUSD" }));
yes("hash changes with content", buildInputHash(h) !== buildInputHash({ ...h, entry: 2 }));
yes("hash changes when screenshot changes", buildInputHash({ ...h, shot: "a" }) !== buildInputHash({ ...h, shot: "b" }));

// --- schema still rejects bad real-provider output ---
yes("prose rejected", !setupAnalysisSchema.safeParse("Sure! Here's my analysis").success);
yes("confidence > 1 rejected", !setupAnalysisSchema.safeParse({ ...analysis.data, confidence: 1.3 }).success);
yes("NaN confidence rejected", !setupAnalysisSchema.safeParse({ ...analysis.data, confidence: NaN }).success);
yes("injection-shaped tag rejected", !suggestedTagsSchema.safeParse({ tags: [{ tag: "'; drop table setups;--", confidence: 0.5 }] }).success);
yes("invalid enum in query rejected", !semanticQuerySchema.safeParse({ result: "DROP TABLE" }).success);
check("fenced JSON recovered", extractJson('```json\n{"a":1}\n```'), { a: 1 });
check("unrecoverable JSON returns null", extractJson("not json"), null);

// --- gating ---
check("free blocked from auto-tagging", canUseFeature("free", "ai_auto_tagging"), false);
check("free blocked from OCR", canUseFeature("free", "ai_ocr"), false);
check("free blocked from semantic search", canUseFeature("free", "semantic_search"), false);
check("free keeps analysis", canUseFeature("free", "ai_analysis"), true);
check("pro unlocks auto-tagging", canUseFeature("pro", "ai_auto_tagging"), true);
check("auto-tagging requires pro", requiredTier("ai_auto_tagging"), "pro");
check("free monthly cap", tierLimit("free", "analyses"), 15);
check("elite unmetered", tierLimit("elite", "analyses"), null);

console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
