-- Ensure the payment-proofs bucket exists and stays private.
-- Run via `supabase db push` (applied as postgres owner).
-- Idempotent: safe to run multiple times.
--
-- Why this exists: subscription checkout and activation-fee payment proofs
-- are uploaded to the `payment-proofs` bucket. If the bucket is missing,
-- every upload fails with "bucket not found"; if the policies below are
-- missing, uploads made with the user's own JWT fail with
-- "new row violates row-level security policy" (surfaced in the UI as
-- "Unable to upload image"). The /api/payment-proofs/upload route prefers
-- the service-role client which bypasses RLS, but these policies guarantee
-- the fallback path works too (e.g. local dev without the secret).
--
-- NOTE about storage policies: `CREATE POLICY ON storage.objects` fails in the
-- Supabase SQL Editor with "must be owner of table objects" because the editor
-- role doesn't own that table. It DOES work when applied as a migration
-- (postgres owner), like 032 did for payment-logos. If you only need a quick
-- fix without running migrations, create the policies below via Dashboard:
-- Storage > payment-proofs > Policies > New policy.

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Policies (work when run as a migration / postgres owner).
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete payment proofs" ON storage.objects;

CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);

CREATE POLICY "Admins can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND users.is_admin = true
  )
);
