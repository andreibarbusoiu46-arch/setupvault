-- ---------------------------------------------------------------------------
-- 0006 — token accounting and a burst window on the AI usage ledger
--
-- Two things Phase 6 specified but the ledger could not answer:
--
--   "Track AI usage and token consumption per user where practical."
--   "Add sensible rate limiting."
--
-- `ai_usage` recorded that a call happened, not what it cost, so there was no
-- way to see which users or which features were expensive — only how many
-- requests they made. A vision analysis of a 1.2MP screenshot and a four-word
-- semantic search counted the same.
--
-- Additive and reversible: three nullable columns and one index. Nothing is
-- dropped, no existing row changes, and every existing query still returns
-- the same rows. Rolling back is the `down` block at the bottom.
-- ---------------------------------------------------------------------------

alter table public.ai_usage
  add column if not exists input_tokens  integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens  integer,
  add column if not exists model         text,
  add column if not exists succeeded     boolean not null default true;

-- Nullable on purpose. A provider that does not report usage must leave these
-- null rather than record a zero: a zero is a measurement, and writing one we
-- never took would quietly understate the bill.
comment on column public.ai_usage.input_tokens is
  'Prompt tokens as the provider reported them. Null when not reported.';
comment on column public.ai_usage.output_tokens is
  'Completion tokens as the provider reported them. Null when not reported.';
comment on column public.ai_usage.total_tokens is
  'Provider-reported total. Not necessarily input + output: some providers bill cached or reasoning tokens separately.';
comment on column public.ai_usage.model is
  'The model string the provider echoed back, which can differ from the one requested.';

-- Why a failed call is still a row.
--
-- Usage was only written after a successful completion, which left a hole: a
-- request that reached the provider and then failed cost real money and
-- counted towards nothing, so it could be repeated without limit. That is a
-- bypass of the usage limits, not merely missing telemetry.
--
-- Every attempt that reaches the provider is now recorded. The two consumers
-- read the ledger differently, which is the point:
--
--   the monthly QUOTA counts succeeded = true, so a provider outage never
--   burns a user's allowance;
--   the burst WINDOW counts every row, so failures still throttle.
--
-- Defaulting to true keeps every pre-existing row meaning what it meant when
-- it was written, since nothing used to record a failure.
comment on column public.ai_usage.succeeded is
  'False when the provider call was attempted but did not produce a validated result. Quota counts only true; the burst window counts every row.';

-- Non-negative where present. A negative token count is a bug upstream, and
-- the ledger is the wrong place to discover it quietly.
alter table public.ai_usage
  drop constraint if exists ai_usage_tokens_non_negative;
alter table public.ai_usage
  add constraint ai_usage_tokens_non_negative check (
    coalesce(input_tokens, 0)  >= 0 and
    coalesce(output_tokens, 0) >= 0 and
    coalesce(total_tokens, 0)  >= 0
  );

-- No new index.
--
-- This migration originally created `ai_usage_user_recent_idx` on
-- (user_id, created_at desc), on the stated grounds that the existing
-- `ai_usage_user_month_idx` was "defined over the month boundary". That was
-- wrong — it was already exactly (user_id, created_at DESC), so the two were
-- byte-identical and Postgres happily kept both: two b-trees to maintain on
-- every insert, for one query plan. The existing index already serves both
-- the monthly quota and the burst window.
--
-- Dropped here rather than quietly left behind, because an index nobody
-- reads is still paid for on every write.
drop index if exists public.ai_usage_user_recent_idx;

-- RLS is already enabled on this table and the existing select-own policy
-- covers the new columns. Writes remain service-role only: there is
-- deliberately no insert policy, so a user cannot forge their own ledger.

-- ---------------------------------------------------------------------------
-- down
--
--   alter table public.ai_usage drop constraint if exists ai_usage_tokens_non_negative;
--   alter table public.ai_usage
--     drop column if exists input_tokens,
--     drop column if exists output_tokens,
--     drop column if exists total_tokens,
--     drop column if exists model,
--     drop column if exists succeeded;
-- ---------------------------------------------------------------------------
