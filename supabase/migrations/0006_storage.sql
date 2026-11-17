-- ============================================================================
-- ClipSetu — 0006_storage.sql
-- Private Supabase Storage bucket for support-ticket attachments + policies.
-- Requires 0001_schema.sql and 0002_rls.sql (public.is_admin()).
-- ----------------------------------------------------------------------------
-- SECURITY NOTES
--   * The bucket is PRIVATE. Objects are only reachable through a short-lived
--     signed URL minted server-side, so a leaked path is not a public link.
--   * Objects live under "<auth.uid()>/<uuid>.<ext>". The insert policy pins the
--     first path segment to the caller's own user id, so one user can never
--     write into another user's prefix.
--   * The bucket repeats the MIME allowlist + 5 MiB cap enforced in
--     src/lib/support-attachments.ts — defence in depth if that check is ever
--     bypassed.
--   * Storage RLS is enabled by Supabase on storage.objects by default; this
--     migration only ADDS policies scoped to this bucket.
-- ============================================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  5242880, -- 5 MiB
  array['image/png','image/jpeg','image/webp','image/gif','application/pdf']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A signed-in user may upload only into their own "<uid>/..." prefix.
create policy support_attachments_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'support-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- A user may read (and therefore sign) their own objects; staff may read every
-- object so they can view attachments on any ticket.
create policy support_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'support-attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or owner = auth.uid()
      or public.is_admin()
    )
  );

commit;
