-- ---------------------------------------------------------------------------
-- 0007 — record which provider produced an analysis
--
-- Phase 6 listed `provider` among the fields of `setup_ai_analyses`, and it
-- was never added. It did not matter while there was one provider. It does
-- now: the application can be pointed at Gemini or at Anthropic with one
-- environment variable, so a stored analysis currently says what model
-- answered but not whose.
--
-- Model strings happen to be distinguishable today (`gemini-…` versus
-- `claude-…`), so nothing is lost yet — but that is a coincidence of naming,
-- not a fact the schema states, and a history you have to parse to interpret
-- is a history you will eventually misread.
--
-- Additive and reversible: one nullable column and nothing else. Existing
-- rows stay null, which is honest — those analyses were produced before the
-- column existed and guessing their provider from the model string would be
-- inventing data rather than recording it.
-- ---------------------------------------------------------------------------

alter table public.setup_ai_analyses
  add column if not exists provider text;

comment on column public.setup_ai_analyses.provider is
  'Which AI provider produced this analysis: gemini, anthropic or mock. Null for rows written before this column existed.';

-- A failed analysis stored a code and nothing else, so `provider_error`
-- covered a rejected request, an outage, a safety block and an unexpected
-- exception alike. Diagnosing one meant reading the platform logs, and if
-- they had rolled off, it could not be diagnosed at all.
--
-- This holds a short, truncated reason. It is written by the server, read
-- only by the row's owner under the existing RLS policy, and deliberately
-- capped: enough to tell a 400 from a timeout, not a transcript.
alter table public.setup_ai_analyses
  add column if not exists error_detail text;

alter table public.setup_ai_analyses
  drop constraint if exists ai_analyses_error_detail_len;
alter table public.setup_ai_analyses
  add constraint ai_analyses_error_detail_len
    check (error_detail is null or char_length(error_detail) <= 400);

comment on column public.setup_ai_analyses.error_detail is
  'Short, truncated provider reason for a failure. Never a secret, never a full response body.';

-- ---------------------------------------------------------------------------
-- down
--
--   alter table public.setup_ai_analyses drop constraint if exists ai_analyses_error_detail_len;
--   alter table public.setup_ai_analyses
--     drop column if exists provider,
--     drop column if exists error_detail;
-- ---------------------------------------------------------------------------
