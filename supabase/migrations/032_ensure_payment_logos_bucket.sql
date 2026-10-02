-- Ensure the payment-logos bucket exists and is publicly readable.
-- Run this in Supabase SQL Editor or via `supabase db push`.
-- Idempotent: safe to run multiple times.
--
-- Why this exists: the admin payment-methods manager uploads logos to the
-- `payment-logos` bucket. If the bucket was never created in the dashboard,
-- every upload fails with "bucket not found". This migration guarantees it.
--
-- NOTE about storage policies: `CREATE POLICY ON storage.objects` fails in the
-- SQL Editor with "must be owner of table objects" because the editor role
-- doesn't own that table. It DOES work when applied as a migration (postgres
-- owner). If you run this file's bucket INSERT via the SQL Editor, create the
-- 4 policies below via Dashboard: Storage > payment-logos > Policies.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-logos', 'payment-logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policies (work when run as a migration / postgres owner).
DROP POLICY IF EXISTS "Authenticated users can upload payment logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update payment logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete payment logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read payment logos" ON storage.objects;

CREATE POLICY "Authenticated users can upload payment logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-logos');

CREATE POLICY "Authenticated users can update payment logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-logos')
WITH CHECK (bucket_id = 'payment-logos');

CREATE POLICY "Authenticated users can delete payment logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'payment-logos');

CREATE POLICY "Public can read payment logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-logos');
