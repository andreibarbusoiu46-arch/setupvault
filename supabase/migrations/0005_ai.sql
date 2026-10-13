-- ============================================================================
-- SetupVault — Phase 6: AI analysis
-- Run in the Supabase SQL Editor after 0004. Safe to re-run.
-- ============================================================================

do $$ begin
  create type public.ai_analysis_type as enum (
    'setup_analysis', 'auto_tagging', 'ocr_levels', 'score_explanation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_analysis_status as enum (
    'pending', 'processing', 'completed', 'failed'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 1. Analyses
--    One row per run. Re-analysing appends; history is never overwritten.
--    Only the structured, validated output is stored — not the raw provider
--    response, which is large and holds nothing the app reads.
-- ----------------------------------------------------------------------------
create table if not exists public.setup_ai_analyses (
  id               uuid primary key default gen_random_uuid(),
  setup_id         uuid not null references public.setups (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  analysis_type    public.ai_analysis_type not null default 'setup_analysis',
  status           public.ai_analysis_status not null default 'pending',
  model            text,
  analysis_version integer not null default 1,
  /** Hash of the setup fields the analysis was derived from. Drives caching. */
  input_hash       text not null,
  used_screenshot  boolean not null default false,
  result_json      jsonb,
  confidence       numeric(4, 3),
  error_code       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint ai_confidence_range
    check (confidence is null or (confidence >= 0 and confidence <= 1))
);

comment on table public.setup_ai_analyses is
  'Structured, validated AI output for a setup. Append-only history; owned by exactly one user.';

drop trigger if exists ai_analyses_set_updated_at on public.setup_ai_analyses;
create trigger ai_analyses_set_updated_at
  before update on public.setup_ai_analyses
  for each row execute function public.set_updated_at();

-- Newest analysis of a given type for a given setup — the only read pattern.
create index if not exists ai_analyses_setup_idx
  on public.setup_ai_analyses (setup_id, analysis_type, created_at desc);
create index if not exists ai_analyses_user_idx
  on public.setup_ai_analyses (user_id, created_at desc);
-- Cache lookup.
create index if not exists ai_analyses_hash_idx
  on public.setup_ai_analyses (user_id, input_hash, analysis_type)
  where status = 'completed';
-- At most one run in flight per setup and type: the guard against double-clicks.
create unique index if not exists ai_analyses_one_in_flight
  on public.setup_ai_analyses (setup_id, analysis_type)
  where status in ('pending', 'processing');

-- ----------------------------------------------------------------------------
-- 2. Usage ledger
--    One row per billable call, so limits are enforced from the database rather
--    than from anything the browser claims.
-- ----------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  feature       text not null,
  used_vision   boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists ai_usage_user_month_idx
  on public.ai_usage (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.setup_ai_analyses enable row level security;
alter table public.ai_usage          enable row level security;

drop policy if exists "ai_analyses_select_own" on public.setup_ai_analyses;
create policy "ai_analyses_select_own" on public.setup_ai_analyses
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Inserts and updates are performed server-side only. No client-side write
-- policy exists, so a browser cannot fabricate an analysis for itself.
drop policy if exists "ai_analyses_delete_own" on public.setup_ai_analyses;
create policy "ai_analyses_delete_own" on public.setup_ai_analyses
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ai_usage_select_own" on public.ai_usage;
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant select, delete on public.setup_ai_analyses to authenticated;
grant select on public.ai_usage to authenticated;
