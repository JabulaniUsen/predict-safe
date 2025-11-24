-- Setup storage policies for logo bucket
-- NOTE: This requires service role permissions
-- Run this in Supabase SQL Editor with service role key, or set up policies via Dashboard

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo', 'logo', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- IMPORTANT: Storage policies must be created via Supabase Dashboard
-- Go to: Storage > logo > Policies
-- 
-- Create these 4 policies:
--
-- 1. INSERT Policy:
--    Name: "Allow authenticated admins to upload logos"
--    Operation: INSERT
--    Target roles: authenticated
--    WITH CHECK expression:
--      bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--
-- 2. UPDATE Policy:
--    Name: "Allow authenticated admins to update logos"
--    Operation: UPDATE
--    Target roles: authenticated
--    USING expression:
--      bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--    WITH CHECK expression:
--      bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--
-- 3. DELETE Policy:
--    Name: "Allow authenticated admins to delete logos"
--    Operation: DELETE
--    Target roles: authenticated
--    USING expression:
--      bucket_id = 'logo' AND EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
--
-- 4. SELECT Policy (Public Read):
--    Name: "Allow public read access to logos"
--    Operation: SELECT
--    Target roles: public
--    USING expression:
--      bucket_id = 'logo'

-- ALTERNATIVE: If admin check doesn't work, use this simpler policy for testing:
-- INSERT Policy (Simplified - allows all authenticated users):
--    Name: "Allow authenticated users to upload logos"
--    Operation: INSERT
--    Target roles: authenticated
--    WITH CHECK expression:
--      bucket_id = 'logo'

