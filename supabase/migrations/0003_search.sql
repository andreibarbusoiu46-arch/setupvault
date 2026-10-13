-- ============================================================================
-- SetupVault — Phase 3: search and filter support
-- Run in the Supabase SQL Editor after 0001 and 0002. Safe to re-run.
--
-- Adds one denormalised, indexed column so a single ILIKE can search title,
-- ticker, market, strategy, notes and tags at once — instead of six ORed
-- columns, none of which could use an index, and a tags array that ILIKE
-- cannot reach at all.
-- ============================================================================

-- Trigram matching is what makes `ilike '%term%'` index-backed rather than a
-- sequential scan of the whole table.
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- 1. The search column
--    Maintained by trigger rather than declared GENERATED: array_to_string is
--    not immutable, so Postgres refuses it in a generated expression.
-- ----------------------------------------------------------------------------
alter table public.setups
  add column if not exists search_text text;

create or replace function public.setups_build_search_text()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.search_text :=
    lower(
      concat_ws(' ',
        new.title,
        new.ticker,
        new.market::text,
        coalesce(new.strategy, ''),
        coalesce(new.notes, ''),
        coalesce(array_to_string(new.tags, ' '), '')
      )
    );
  return new;
end;
$$;

drop trigger if exists setups_search_text on public.setups;
create trigger setups_search_text
  before insert or update of title, ticker, market, strategy, notes, tags
  on public.setups
  for each row execute function public.setups_build_search_text();

-- Backfill rows that predate this migration.
update public.setups
set search_text = lower(
  concat_ws(' ',
    title, ticker, market::text,
    coalesce(strategy, ''), coalesce(notes, ''),
    coalesce(array_to_string(tags, ' '), '')
  )
)
where search_text is null;

create index if not exists setups_search_text_idx
  on public.setups using gin (search_text gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 2. Filter and sort indexes
--    Every one is prefixed with user_id, because no query in this product ever
--    reads across users — RLS would refuse it anyway.
--    0001 already covers created_at, is_favorite, market, result and ticker.
-- ----------------------------------------------------------------------------
create index if not exists setups_user_direction_idx on public.setups (user_id, direction);
create index if not exists setups_user_strategy_idx  on public.setups (user_id, strategy);
create index if not exists setups_user_traded_idx    on public.setups (user_id, traded_on desc);
create index if not exists setups_user_updated_idx   on public.setups (user_id, updated_at desc);
create index if not exists setups_user_rr_idx        on public.setups (user_id, risk_reward desc);

-- Deliberately not indexed: `entry`. It is sortable in the UI but almost never
-- the filter, and an index that is only ever used for an ORDER BY on a small
-- per-user slice does not pay for its write cost.
