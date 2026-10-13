-- ============================================================================
-- SetupVault — Phase 5: setup score support
-- Run in the Supabase SQL Editor after 0003. Safe to re-run.
--
-- The score itself is NOT stored. It is derived from fields the row already
-- holds, it is deterministic, and it costs microseconds to compute — storing it
-- would only create a second copy that can fall out of step with the setup.
--
-- The one thing this adds is a cheap way to know whether a setup has notes
-- without transferring the notes themselves, which can be 5000 characters and
-- are never displayed in a list or a chart.
-- ============================================================================

alter table public.setups
  add column if not exists notes_length integer
    generated always as (coalesce(length(btrim(notes)), 0)) stored;

comment on column public.setups.notes_length is
  'Trimmed length of notes. Lets the score and analytics read documentation completeness without selecting the notes body.';
