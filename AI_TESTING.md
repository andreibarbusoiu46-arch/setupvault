# Testing the AI features without an API key

SetupVault ships two AI providers behind one interface. Which one runs is
decided by a single environment variable, and nothing in the UI, the services,
the validation, the database writes or the premium gating knows the difference.

```
AI_PROVIDER=mock   # development: no key, no cost, no network call
AI_PROVIDER=real   # production: calls the configured model
```

---

## 1. Running with the mock provider

In `.env.local`:

```dotenv
AI_PROVIDER=mock
```

That is the whole setup. No `AI_API_KEY` is needed. Restart the dev server —
environment variables are read at startup.

You still need the database migration, because the mock persists its output
through exactly the same tables as the real provider:

```
supabase/migrations/0005_ai.sql
```

### What the mock actually does

It is not canned text. Each response is **derived from the setup being
analysed**: the ratio it comments on is your ratio, the direction is your
direction, and the levels it reads back match the record. If the wiring between
the page and the provider is wrong, you see it immediately instead of seeing a
plausible paragraph about somebody else's trade.

Two consequences worth knowing:

- **No screenshot means no visual claims.** Without an image the mock returns
  `unclear` for market structure, liquidity and support/resistance, reports no
  detected patterns, and says in `uncertainty` that no chart was available —
  the same rule the real prompt enforces.
- **It is deterministic.** The same setup produces the same analysis, which is
  what makes cache behaviour testable.

---

## 2. Testing each feature by hand

| # | Feature | How to test |
|---|---------|-------------|
| 1 | Setup analysis | Open a setup → **Analyze with AI** |
| 2 | Vision analysis | Attach a screenshot first, then analyse. Visual sections stop saying "unclear" |
| 3 | Text-only fallback | Analyse a setup with no screenshot. Visual sections must stay "unclear" |
| 4 | Persistence | Refresh the page. The analysis is still there, read back from Supabase |
| 5 | History | **Re-analyze** → a new row appears in `setup_ai_analyses`. The old one is never overwritten |
| 6 | Cache | Analyse, then analyse again without changing anything. Returns instantly and `cached: true` |
| 7 | Cache invalidation | Edit the setup, then analyse. New analysis, because the input hash changed |
| 8 | Double-click guard | Click **Analyze** twice quickly. The second gets 409, not a second run |
| 9 | Auto-tagging | **Suggest tags** → accept one → it appears on the setup. Reject → nothing happens |
| 10 | OCR | **Read levels** on a setup with a screenshot |
| 11 | OCR refusal | Set `AI_MOCK_FAILURE=ocr_mismatch`. The reading is refused for being geometrically impossible |
| 12 | Premium locking | Keep `subscription_tier` at `free`. Auto-tagging and OCR show the locked card |
| 13 | Premium unlocked | Set the tier to `pro` in Supabase Table Editor, reload |
| 14 | Usage limits | Free tier allows 15 analyses and 5 with vision per month. The 16th returns a limit message |
| 15 | Semantic search | `POST /api/ai/search` with `{"query":"losing long setups from last month"}` |

### Changing your tier for testing

Only from the Supabase **Table Editor**, on your row in `profiles`. The column
is deliberately not writable from the application — Phase 1 revoked update
permission on `subscription_tier`, so a browser cannot grant itself Pro.

---

## 3. Testing the failure paths

The half of the UI that normally never gets exercised until production:

```dotenv
AI_MOCK_FAILURE=timeout          # → "The analysis took too long"
AI_MOCK_FAILURE=rate_limited     # → "The AI provider is busy"
AI_MOCK_FAILURE=provider_error   # → "The AI provider could not be reached"
AI_MOCK_FAILURE=unauthorized     # → "The AI credentials were rejected"
AI_MOCK_FAILURE=invalid_output   # → "The analysis came back unreadable"
AI_MOCK_FAILURE=ocr_mismatch     # → OCR levels on the wrong side of entry
AI_MOCK_FAILURE=ocr_ambiguous    # → OCR cannot assign the numbers to levels
```

Unset the variable to go back to success. Also:

```dotenv
AI_MOCK_DELAY_MS=4000   # slow it down to inspect the loading state
AI_MOCK_DELAY_MS=0      # instant, for automated tests
```

After a failed run the analysis row is marked `failed` with the error code, and
the in-flight claim is released so the next attempt is not blocked.

---

## 4. Switching to the real provider

```dotenv
AI_PROVIDER=real
AI_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-6   # optional
```

Get a key from [console.anthropic.com](https://console.anthropic.com) under
**API Keys**. It requires account credit. Analyses without a screenshot cost
well under a cent; analyses with one cost a few cents, because the image is
sent to the model.

No application code changes. The UI, services, schemas, persistence and gating
are identical — only the class behind `AIProvider` differs.

**The mock is never a fallback.** If `AI_PROVIDER=real` and the key is missing
or wrong, the request fails with a clear error. It does not quietly return
fabricated analysis, because output that looks like a model read your chart
when nothing did is worse than an error message.

---

## 5. The mock is visible in the interface

While `AI_PROVIDER=mock` is set, the AI panel carries a red **"Mock provider —
not real AI"** badge, and every generated analysis is preceded by a line saying
no model read the setup.

This is deliberate and should not be removed. Documentation cannot guarantee
that a mock response is never mistaken for a real one; the screen can.

---

## 6. Automated tests

`npm run test:ai` runs 56 checks against the mock provider and the validation
layer. No network calls, no API key, no cost.

It verifies that mock output satisfies the same Zod schemas as the real
provider, that output is derived from the input rather than canned, that a
missing screenshot produces no visual claims, that OCR geometry is checked
against direction in both directions, that every failure mode surfaces the
right error code, that hashing drives the cache correctly, that malformed and
injection-shaped output is rejected, and that the free/pro/elite gating matrix
holds.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "AI is not configured on this server yet" | `AI_PROVIDER=real` with no key | Set `AI_API_KEY`, or use `AI_PROVIDER=mock` |
| `Unknown AI_PROVIDER: ...` | Typo in the variable | Use exactly `mock` or `real` |
| Error about a missing table | Migration not run | Run `supabase/migrations/0005_ai.sql` |
| Changes to `.env.local` do nothing | Read only at startup | Restart the dev server |
| "An analysis is already running" | A previous run is still claimed | Wait, or it self-releases after five minutes |
| Premium cards still locked on Pro | Page served before the tier changed | Hard refresh |
