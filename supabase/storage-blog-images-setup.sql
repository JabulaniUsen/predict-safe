-- Storage bucket setup for blog images
-- Run this in Supabase SQL Editor after creating the storage bucket in the dashboard

-- Step 1: Create the storage bucket in Supabase Dashboard > Storage first
-- Bucket name: blog-images
-- Public: true (so images can be accessed via public URLs)

-- Step 2: Run this SQL to set up the policies

-- Policy: Admins can upload blog images
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

-- Policy: Everyone can view blog images (public bucket)
CREATE POLICY "Everyone can view blog images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-images');

-- Policy: Admins can update blog images
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
);

-- Policy: Admins can delete blog images
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

