-- ============================================================================
-- SetupVault — initial schema
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.subscription_tier as enum ('free', 'pro', 'elite');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.theme_preference as enum ('dark', 'light', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.market_type as enum (
    'forex', 'crypto', 'stocks', 'indices', 'futures', 'commodities', 'options'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_direction as enum ('long', 'short');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.trade_result as enum ('win', 'loss', 'breakeven', 'pending');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. Shared trigger function: keep updated_at honest
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. profiles — one row per authenticated user
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null,
  full_name           text,
  avatar_url          text,
  bio                 text,
  subscription_tier   public.subscription_tier not null default 'free',
  theme               public.theme_preference not null default 'dark',
  email_notifications boolean not null default true,
  product_updates     boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 80),
  constraint profiles_bio_length       check (bio is null or char_length(bio) <= 280),
  constraint profiles_avatar_url_shape check (avatar_url is null or avatar_url ~ '^https?://')
);

comment on table public.profiles is
  'Public profile and preferences for each auth.users row. Deleted automatically with the user.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. setups — the core SetupVault entity
--    The table exists from day one so the schema never has to be restructured.
--    Application CRUD arrives in Phase 2.
-- ----------------------------------------------------------------------------
create table if not exists public.setups (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  title           text not null,
  ticker          text not null,
  market          public.market_type not null,
  direction       public.trade_direction not null,
  traded_on       date,
  traded_at       time,
  entry           numeric(20, 8),
  stop_loss       numeric(20, 8),
  take_profit     numeric(20, 8),
  risk_reward     numeric(10, 2),
  result          public.trade_result not null default 'pending',
  strategy        text,
  notes           text,
  tags            text[] not null default '{}',
  screenshot_path text,
  is_favorite     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint setups_title_length    check (char_length(title) between 1 and 120),
  constraint setups_ticker_length   check (char_length(ticker) between 1 and 20),
  constraint setups_strategy_length check (strategy is null or char_length(strategy) <= 120),
  constraint setups_notes_length    check (notes is null or char_length(notes) <= 5000),
  constraint setups_tags_count      check (array_length(tags, 1) is null or array_length(tags, 1) <= 20),
  constraint setups_prices_positive check (
    (entry is null or entry > 0)
    and (stop_loss is null or stop_loss > 0)
    and (take_profit is null or take_profit > 0)
  ),
  constraint setups_rr_range        check (risk_reward is null or (risk_reward >= 0 and risk_reward <= 1000))
);

comment on table public.setups is
  'A saved trading setup. Owned by exactly one user and isolated by RLS.';

drop trigger if exists setups_set_updated_at on public.setups;
create trigger setups_set_updated_at
  before update on public.setups
  for each row execute function public.set_updated_at();

-- Indexes reflect how the library will actually be read: newest first,
-- filtered by owner, then narrowed by favourite / market / result / tag.
create index if not exists setups_user_created_idx  on public.setups (user_id, created_at desc);
create index if not exists setups_user_favorite_idx on public.setups (user_id, is_favorite) where is_favorite;
create index if not exists setups_user_market_idx   on public.setups (user_id, market);
create index if not exists setups_user_result_idx   on public.setups (user_id, result);
create index if not exists setups_user_ticker_idx   on public.setups (user_id, ticker);
create index if not exists setups_tags_idx          on public.setups using gin (tags);

-- ----------------------------------------------------------------------------
-- 5. Create a profile whenever a user signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in step with a confirmed email change.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Backfill any users that existed before this migration ran.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), '')
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
--    Nothing in this schema is readable without a matching auth.uid().
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.setups   enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy on profiles: rows disappear when the auth user is deleted.

drop policy if exists "setups_select_own" on public.setups;
create policy "setups_select_own" on public.setups
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "setups_insert_own" on public.setups;
create policy "setups_insert_own" on public.setups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "setups_update_own" on public.setups;
create policy "setups_update_own" on public.setups
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "setups_delete_own" on public.setups;
create policy "setups_delete_own" on public.setups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- 7. Grants
--    RLS still decides which rows are visible; these only open the door.
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.setups to authenticated;

-- Columns a user must never set for themselves.
revoke update (id, email, subscription_tier, created_at) on public.profiles from authenticated;
revoke update (id, user_id, created_at) on public.setups from authenticated;
