-- ============================================================
-- WASLA: profile + avatar fixes (2026-05-04)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run — every statement is idempotent.
-- ============================================================

-- 1. Add the missing profile columns the Settings page writes to.
--    Without these, "Failed to save profile." surfaces because Postgres
--    rejects the upsert with `column "company" of relation "profiles"
--    does not exist`.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS company TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT TRUE;

-- 2. Create the `avatars` storage bucket for profile photos. The Settings
--    page uploads to this bucket; without it, the upload silently fails.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880, -- 5 MB, matches client-side validation in Settings.jsx
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. RLS policies for the `avatars` bucket.
--    Path layout: {userId}/avatar.{ext} — the first folder must equal the
--    authenticated user id, so each user can only upload to their own folder.
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read so the avatar URL works in <img src> without signed URLs.
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ============================================================
-- DONE. Hard-refresh the app and try Settings → Change Photo.
-- ============================================================
