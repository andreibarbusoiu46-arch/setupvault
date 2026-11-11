-- ---------------------------------------------------------------------------
-- 0008 — the fields a broker export carries, and the means to import it twice
--        safely
--
-- `setups` was shaped for a setup someone typed in: entry, stop, target, and
-- a date they traded on. A broker CSV carries more than that — what the trade
-- closed at, how big it was, what it made, what it cost in commission and
-- swap, and timestamps with a time zone rather than a bare date.
--
-- Three groups of columns, for three different reasons.
--
-- OUTCOME AND SIZE. exit_price, size, pnl, commission, swap. All nullable:
-- an export may carry any subset, and the spec is explicit that a missing
-- value must stay missing rather than be computed from an assumption. pnl in
-- particular is the broker's own figure and is NOT derived here — fees,
-- partial fills and swap make a recomputed number disagree with the user's
-- statement, and the statement is the thing they trust.
--
-- TIME. opened_at and closed_at as timestamptz, because a CSV row has a
-- moment, not a day. `traded_on` and `traded_at` stay exactly as they are and
-- the importer fills them from opened_at, because the Setup Score and the
-- analytics read those two and nothing else — adding a timestamp without
-- populating the date would quietly leave every imported trade out of the
-- score.
--
-- PROVENANCE AND DEDUPLICATION. source says where a row came from.
-- import_batch_id groups one import so it can be reviewed or undone as a
-- unit. import_fingerprint carries the identity the duplicate check is built
-- on, and the partial unique index below is what makes that check hold
-- against concurrent requests: a front-end check can be raced, two API calls
-- can both pass a SELECT, but only one of them can win a unique index.
--
-- Additive and reversible. Nothing is dropped, no existing row changes, and
-- every current query returns the same rows.
-- ---------------------------------------------------------------------------

alter table public.setups
  add column if not exists exit_price         numeric,
  add column if not exists size               numeric,
  add column if not exists pnl                numeric,
  add column if not exists commission         numeric,
  add column if not exists swap               numeric,
  add column if not exists timeframe          text,
  add column if not exists opened_at          timestamptz,
  add column if not exists closed_at          timestamptz,
  add column if not exists source             text not null default 'manual',
  add column if not exists import_batch_id    uuid,
  add column if not exists import_fingerprint text;

comment on column public.setups.exit_price is
  'Where the trade actually closed. Null while it is open or was never recorded.';
comment on column public.setups.size is
  'Position size in whatever unit the export used — lots, contracts, units, coins. The unit is not normalised because it is not knowable from a CSV.';
comment on column public.setups.pnl is
  'The broker''s own realised figure, stored as given and never recomputed: fees, partial fills and swap make a derived number disagree with the statement the user trusts.';
comment on column public.setups.commission is
  'Trading fee as the export reported it. Sign is preserved rather than normalised, because exports disagree about whether a cost is negative.';
comment on column public.setups.swap is
  'Financing or funding cost, as reported.';
comment on column public.setups.timeframe is
  'Chart timeframe as a free label (1m, 15m, 4H, D). Free text because every platform spells it differently and a closed enum would reject valid data.';
comment on column public.setups.opened_at is
  'When the position opened, with time zone. traded_on and traded_at are derived from this; the score and analytics read those.';
comment on column public.setups.closed_at is
  'When the position closed, with time zone.';
comment on column public.setups.source is
  'manual, csv_import or screenshot. Lets a user tell what they typed from what a machine read.';
comment on column public.setups.import_batch_id is
  'Groups the rows of one import so a batch can be reviewed or removed as a unit.';
comment on column public.setups.import_fingerprint is
  'Stable identity of an imported trade: user, ticker, direction, entry and opened_at, normalised and hashed. Null for anything not imported.';

-- Sanity, not business rules. Each of these is a value no export legitimately
-- produces, so the ledger is the wrong place to accept it quietly.
alter table public.setups drop constraint if exists setups_source_known;
alter table public.setups
  add constraint setups_source_known
    check (source in ('manual', 'csv_import', 'screenshot'));

alter table public.setups drop constraint if exists setups_size_non_negative;
alter table public.setups
  add constraint setups_size_non_negative
    check (size is null or size >= 0);

alter table public.setups drop constraint if exists setups_timeframe_len;
alter table public.setups
  add constraint setups_timeframe_len
    check (timeframe is null or char_length(timeframe) <= 16);

-- A trade cannot close before it opens. Both nullable, so this only bites
-- when both are present.
alter table public.setups drop constraint if exists setups_closed_after_opened;
alter table public.setups
  add constraint setups_closed_after_opened
    check (opened_at is null or closed_at is null or closed_at >= opened_at);

-- The duplicate guard.
--
-- Partial, so the millions of hand-entered setups that will never have a
-- fingerprint do not pay for it, and scoped to the user, so two people
-- importing the same public trade do not collide. This is what makes
-- "protect against repeated imports and concurrent requests" true: the
-- application also checks, but the check can be raced and this cannot.
create unique index if not exists setups_user_fingerprint_uniq
  on public.setups (user_id, import_fingerprint)
  where import_fingerprint is not null;

create index if not exists setups_user_batch_idx
  on public.setups (user_id, import_batch_id)
  where import_batch_id is not null;

-- Existing RLS policies are defined on the table and cover every column, so
-- the new ones are already isolated per user. Nothing to add.

-- ---------------------------------------------------------------------------
-- down
--
--   drop index if exists public.setups_user_batch_idx;
--   drop index if exists public.setups_user_fingerprint_uniq;
--   alter table public.setups
--     drop constraint if exists setups_closed_after_opened,
--     drop constraint if exists setups_timeframe_len,
--     drop constraint if exists setups_size_non_negative,
--     drop constraint if exists setups_source_known;
--   alter table public.setups
--     drop column if exists import_fingerprint,
--     drop column if exists import_batch_id,
--     drop column if exists source,
--     drop column if exists closed_at,
--     drop column if exists opened_at,
--     drop column if exists timeframe,
--     drop column if exists swap,
--     drop column if exists commission,
--     drop column if exists pnl,
--     drop column if exists size,
--     drop column if exists exit_price;
-- ---------------------------------------------------------------------------
