// Run with: npm run test:ai:wire
//
// What goes on the wire, without spending a credit.
//
// The schema and error tests in run.ts cover the pieces in isolation. This
// one asserts the thing those cannot: that a real `complete()` call produces
// a correctly shaped HTTP request to Google, and that a realistic Gemini
// response comes back out as validated data with its token usage attached.
//
// `fetch` is replaced for the duration, so the SDK runs for real — its own
// URL building, header handling and body serialisation all execute — but
// nothing leaves the process. That is the part worth testing: the wire
// format is exactly where a provider integration is wrong in a way that
// compiles, type-checks, and then fails on every live request.

import { GeminiProvider } from "../../lib/ai/gemini.ts";
import { MockAIProvider } from "../../lib/ai/mock.ts";
import { setupAnalysisSchema } from "../../features/ai/schemas.ts";
import { AIError } from "../../lib/ai/provider.ts";

let fails = 0;
const check = (n: string, a: unknown, e: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${ok ? "" : ` (got ${JSON.stringify(a)?.slice(0, 160)})`}`);
};
const yes = (n: string, c: boolean) => check(n, c, true);

const KEY = "test-key-not-a-real-credential";
const MODEL = "gemini-3.8-flash";

/**
 * A schema-valid analysis, taken from the mock provider rather than written
 * out here.
 *
 * Hand-writing a fixture means hand-maintaining it: the first time anyone
 * adds a required field to `setupAnalysisSchema`, a literal in this file goes
 * stale and the test fails for a reason that has nothing to do with Gemini.
 * The mock already produces a valid payload by construction, so it is the
 * fixture.
 */
process.env.AI_MOCK_DELAY_MS = "0";
const ANALYSIS = (
  await new MockAIProvider().complete({
    intent: "setup_analysis",
    systemPrompt: "",
    userContent: `Ticker: EURUSD
Market: forex
Direction: long
Entry: 1.084
Stop loss: 1.079
Take profit: 1.099`,
    schema: setupAnalysisSchema,
  })
).data;

// If this ever fails, the fixture is the problem, not the provider.
yes("fixture is schema-valid", setupAnalysisSchema.safeParse(ANALYSIS).success);

interface Captured {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Installs a fetch that captures the request and replies with `reply`. */
function stub(reply: () => { status: number; body: unknown }) {
  const seen: Captured[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String((input as { url?: string })?.url ?? input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers as HeadersInit).forEach((v, k) => (headers[k] = v));
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(String(init?.body ?? "{}"));
    } catch {
      /* non-JSON body is itself a finding; the assertions below will show it */
    }
    seen.push({ url, headers, body });

    const { status, body: payload } = reply();
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  return { seen, restore: () => { globalThis.fetch = original; } };
}

const okReply = (text: string, usage = { promptTokenCount: 1870, candidatesTokenCount: 412, totalTokenCount: 2282 }) => () => ({
  status: 200,
  body: {
    candidates: [{ content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }],
    usageMetadata: usage,
    modelVersion: MODEL,
  },
});

/* ── 1. A text-only call ─────────────────────────────────────────────────── */
{
  const { seen, restore } = stub(okReply(JSON.stringify(ANALYSIS)));
  const provider = new GeminiProvider(KEY, MODEL);

  const result = await provider.complete({
    intent: "setup_analysis",
    systemPrompt: "SYSTEM-INSTRUCTION-SENTINEL",
    userContent: "USER-CONTENT-SENTINEL",
    schema: setupAnalysisSchema,
    maxTokens: 2400,
  });
  restore();

  check("one request made", seen.length, 1);
  const [req] = seen;

  yes("url targets the configured model", req.url.includes(MODEL));
  yes("url does not carry the key", !req.url.includes(KEY));
  yes(
    "key travels in a header",
    Object.entries(req.headers).some(([, v]) => v.includes(KEY)),
  );

  const cfg = req.body.generationConfig as Record<string, unknown> | undefined;
  const sys = req.body.systemInstruction as { parts?: { text?: string }[] } | undefined;
  const contents = req.body.contents as { parts?: Record<string, unknown>[] }[] | undefined;

  const systemText = sys?.parts?.map((p) => p.text).join("") ?? "";
  const userText = JSON.stringify(contents ?? []);

  yes("system prompt is sent as systemInstruction", systemText.includes("SYSTEM-INSTRUCTION-SENTINEL"));
  yes("user content is sent as contents", userText.includes("USER-CONTENT-SENTINEL"));
  // The separation is the prompt-injection boundary: user text, including
  // whatever was written inside a screenshot, must never be concatenated
  // into the instruction the model is told to obey.
  yes("user content is NOT inside the system instruction", !systemText.includes("USER-CONTENT-SENTINEL"));
  yes("system prompt is NOT inside the user content", !userText.includes("SYSTEM-INSTRUCTION-SENTINEL"));

  yes("asks for JSON", cfg?.responseMimeType === "application/json");
  yes("sends a response schema", Boolean(cfg?.responseJsonSchema));
  const schemaJson = JSON.stringify(cfg?.responseJsonSchema ?? {});
  yes("schema has no $schema", !schemaJson.includes('"$schema"'));
  yes("schema keeps additionalProperties", schemaJson.includes("additionalProperties"));
  // Must exceed the caller's 2400: on a 3.x model maxOutputTokens caps
  // thinking and output together, so a budget sized for the JSON alone gets
  // spent on reasoning and the call returns 200 with an empty candidate.
  yes(
    `leaves room for thinking above the answer budget (${cfg?.maxOutputTokens})`,
    typeof cfg?.maxOutputTokens === "number" && cfg.maxOutputTokens > 2400,
  );
  yes("holds thinking low for a schema-constrained task", Boolean(cfg?.thinkingConfig));

  check("confidence survives validation", result.data.confidence, ANALYSIS.confidence);
  check("reports input tokens", result.usage?.inputTokens, 1870);
  check("reports output tokens", result.usage?.outputTokens, 412);
  check("reports total tokens", result.usage?.totalTokens, 2282);
  check("reports the model", result.model, MODEL);
  yes("not flagged as mock", result.mock !== true);
}

/* ── 2. A vision call ────────────────────────────────────────────────────── */
{
  const { seen, restore } = stub(okReply(JSON.stringify(ANALYSIS)));
  const provider = new GeminiProvider(KEY, MODEL);

  await provider.complete({
    intent: "setup_analysis",
    systemPrompt: "S",
    userContent: "U",
    image: { mediaType: "image/png", data: "QUJD" },
    schema: setupAnalysisSchema,
  });
  restore();

  const contents = seen[0].body.contents as { parts: Record<string, unknown>[] }[];
  const parts = contents[0].parts;
  const inline = parts.find((p) => "inlineData" in p)?.inlineData as
    | { mimeType?: string; data?: string }
    | undefined;

  yes("image is attached", Boolean(inline));
  check("image mime type is passed through", inline?.mimeType, "image/png");
  check("image data is passed through", inline?.data, "QUJD");
  // Image first, then the text that refers to it.
  yes("image precedes the text part", parts.findIndex((p) => "inlineData" in p) < parts.findIndex((p) => "text" in p));
}

/* ── 3. Retries: transient yes, permanent no ─────────────────────────────── */
{
  let calls = 0;
  const { seen, restore } = stub(() => {
    calls++;
    if (calls === 1) return { status: 503, body: { error: { message: "unavailable", status: 503 } } };
    return okReply(JSON.stringify(ANALYSIS))();
  });

  const provider = new GeminiProvider(KEY, MODEL);
  const result = await provider.complete({
    intent: "setup_analysis",
    systemPrompt: "S",
    userContent: "U",
    schema: setupAnalysisSchema,
  });
  restore();

  check("a 503 is retried and then succeeds", seen.length, 2);
  check("the retry's data is returned", result.data.confidence, ANALYSIS.confidence);
}

{
  const { seen, restore } = stub(() => ({
    status: 400,
    body: { error: { message: "bad request detail", status: 400 } },
  }));

  const provider = new GeminiProvider(KEY, MODEL);
  let caught: unknown;
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
    });
  } catch (error) {
    caught = error;
  }
  restore();

  check("a 400 is not retried", seen.length, 1);
  yes("a 400 surfaces as an AIError", caught instanceof AIError);
  check("a 400 maps to provider_error", (caught as AIError)?.code, "provider_error");
  yes(
    "the provider's own message is not forwarded",
    !String((caught as AIError)?.message).includes("bad request detail"),
  );
}

/* ── 4. Output that does not match the schema is rejected, never returned ── */
{
  const { restore } = stub(okReply(JSON.stringify({ summary: "nope", confidence: 42 })));
  const provider = new GeminiProvider(KEY, MODEL);

  let caught: unknown;
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
    });
  } catch (error) {
    caught = error;
  }
  restore();

  check("malformed output is rejected", (caught as AIError)?.code, "invalid_output");
}

/* ── 5. A blocked prompt is an error, not an empty analysis ──────────────── */
{
  const { restore } = stub(() => ({
    status: 200,
    body: { promptFeedback: { blockReason: "SAFETY" }, candidates: [] },
  }));
  const provider = new GeminiProvider(KEY, MODEL);

  let caught: unknown;
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
    });
  } catch (error) {
    caught = error;
  }
  restore();

  yes("a blocked prompt throws", caught instanceof AIError);
  check("a blocked prompt is a provider_error", (caught as AIError)?.code, "provider_error");
}

/* ── 6. A truncated response is not salvaged ─────────────────────────────── */
{
  const { seen, restore } = stub(() => ({
    status: 200,
    body: {
      candidates: [{ content: { parts: [{ text: '{"summary":"cut off' }] }, finishReason: "MAX_TOKENS" }],
    },
  }));
  const provider = new GeminiProvider(KEY, MODEL);

  let caught: unknown;
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
    });
  } catch (error) {
    caught = error;
  }
  restore();

  check("MAX_TOKENS is not retried", seen.length, 1);
  check("MAX_TOKENS maps to invalid_output", (caught as AIError)?.code, "invalid_output");
}

/* ── 7. The retry budget must fit inside the caller's deadline ──────────── */
//
// This existed as a bug: three attempts of 60s plus backoff, a 182s worst
// case, inside routes whose own maxDuration is 60s and 30s. The platform
// would kill the function mid-retry and the caller would see a generic
// gateway timeout instead of the typed error built here. The budget is now
// shared across attempts, so retries stop when there is not enough left.
{
  let calls = 0;
  const { restore } = stub(() => {
    calls++;
    return { status: 503, body: { error: { message: "unavailable", status: 503 } } };
  });

  const provider = new GeminiProvider(KEY, MODEL);
  const startedAt = Date.now();
  let caught: unknown;
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
      deadlineMs: 3_000,
    });
  } catch (error) {
    caught = error;
  }
  const elapsed = Date.now() - startedAt;
  restore();

  yes("a failing call throws rather than hanging", caught instanceof AIError);
  yes(`stops inside the deadline (took ${elapsed}ms of 3000)`, elapsed < 3_000);
  // 3s is below the 4s a retry needs to be worth starting, so it gives up
  // after the first attempt rather than burning the caller's remaining time.
  check("a budget too small to retry makes exactly one attempt", calls, 1);
}

// A budget that affords exactly one retry must take exactly one — proving
// the arithmetic runs, not merely that it bails out early.
{
  let calls = 0;
  const { restore } = stub(() => {
    calls++;
    return { status: 503, body: { error: { message: "unavailable", status: 503 } } };
  });

  const provider = new GeminiProvider(KEY, MODEL);
  const startedAt = Date.now();
  try {
    await provider.complete({
      intent: "setup_analysis",
      systemPrompt: "S",
      userContent: "U",
      schema: setupAnalysisSchema,
      // 6s: the 0.6s backoff leaves 5.4s, which clears the 4s floor, so the
      // first retry runs. The next would need 1.6s more and leave 3.8s,
      // which does not, so it stops there.
      deadlineMs: 6_000,
    });
  } catch {
    /* expected */
  }
  const elapsed = Date.now() - startedAt;
  restore();

  check("a budget affording one retry makes exactly two attempts", calls, 2);
  yes(`and still finishes inside it (${elapsed}ms of 6000)`, elapsed < 6_000);
}

// And a generous budget still allows the full retry sequence.
{
  let calls = 0;
  const { restore } = stub(() => {
    calls++;
    if (calls < 3) return { status: 503, body: { error: { message: "x", status: 503 } } };
    return okReply(JSON.stringify(ANALYSIS))();
  });

  const provider = new GeminiProvider(KEY, MODEL);
  const result = await provider.complete({
    intent: "setup_analysis",
    systemPrompt: "S",
    userContent: "U",
    schema: setupAnalysisSchema,
    deadlineMs: 30_000,
  });
  restore();

  check("a generous budget allows all three attempts", calls, 3);
  check("and returns the third attempt's data", result.data.confidence, ANALYSIS.confidence);
}

console.log(fails === 0 ? "\nALL WIRE CHECKS PASSED" : `\n${fails} WIRE CHECK(S) FAILED`);
if (fails > 0) process.exitCode = 1;
