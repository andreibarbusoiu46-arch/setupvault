-- ============================================================================
-- SetupVault — Phase 2: screenshot storage
-- Run this in the Supabase SQL Editor after 0001_init.sql.
-- Safe to re-run.
--
-- The `setups` table already carries every column Phase 2 needs (added in
-- 0001), including `screenshot_path`, so no table changes are required here.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Private bucket for setup screenshots
--    Private, not public: files are served through short-lived signed URLs so
--    an object path leaking does not expose the image to the internet.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'setup-screenshots',
  'setup-screenshots',
  false,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 2. Storage policies
--    Objects are stored as <user_id>/<setup_id>/<filename>, so the first path
--    segment is the owner. Postgres compares it against auth.uid(); the browser
--    is never trusted to declare who it is.
-- ----------------------------------------------------------------------------
drop policy if exists "screenshots_select_own" on storage.objects;
create policy "screenshots_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'setup-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "screenshots_insert_own" on storage.objects;
create policy "screenshots_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'setup-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "screenshots_update_own" on storage.objects;
create policy "screenshots_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'setup-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'setup-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "screenshots_delete_own" on storage.objects;
create policy "screenshots_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'setup-screenshots'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
