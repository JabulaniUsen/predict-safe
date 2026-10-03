-- Ensure the blog-images bucket exists and is publicly readable.
-- Run via `supabase db push` (applied as postgres owner).
-- Idempotent: safe to run multiple times.
--
-- Why this exists: the admin blog editor uploads cover images to the
-- `blog-images` bucket. If the bucket is missing, uploads fail with
-- "bucket not found"; if the policies below are missing, uploads made with
-- the admin's own JWT fail with "new row violates row-level security policy".
-- (The API route prefers the service-role client which bypasses RLS, but this
-- guarantees the fallback path works too, e.g. local dev without the secret.)
--
-- NOTE about storage policies: `CREATE POLICY ON storage.objects` fails in the
-- Supabase SQL Editor with "must be owner of table objects" because the editor
-- role doesn't own that table. It DOES work when applied as a migration
-- (postgres owner), like 032 did for payment-logos. If you only need a quick
-- fix without running migrations, create the 4 policies below via Dashboard:
-- Storage > blog-images > Policies > New policy (see MASTER_MIGRATION.sql §7).

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies (work when run as a migration / postgres owner).
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Everyone can view blog images" ON storage.objects;

CREATE POLICY "Admins can upload blog images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'blog-images' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Everyone can view blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can update blog images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'blog-images' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
)
WITH CHECK (
  bucket_id = 'blog-images' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Admins can delete blog images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'blog-images' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);
