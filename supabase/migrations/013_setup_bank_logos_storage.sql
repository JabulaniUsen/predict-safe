-- Create logo storage bucket if it doesn't exist
-- Note: Storage policies must be set up via Supabase Dashboard
-- Go to Storage > logo > Policies and add the following policies:
--
-- 1. INSERT Policy (for authenticated admins):
--    Name: "Allow authenticated admins to upload logos"
--    Target roles: authenticated
--    Policy definition: 
--      (bucket_id = 'logo' AND 
--       EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true))
--
-- 2. UPDATE Policy (for authenticated admins):
--    Name: "Allow authenticated admins to update logos"
--    Target roles: authenticated
--    Policy definition: Same as above
--
-- 3. DELETE Policy (for authenticated admins):
--    Name: "Allow authenticated admins to delete logos"
--    Target roles: authenticated
--    Policy definition: Same as above
--
-- 4. SELECT Policy (for public read):
--    Name: "Allow public read access to logos"
--    Target roles: public
--    Policy definition: (bucket_id = 'logo')

INSERT INTO storage.buckets (id, name, public)
VALUES ('logo', 'logo', true)
ON CONFLICT (id) DO UPDATE SET public = true;