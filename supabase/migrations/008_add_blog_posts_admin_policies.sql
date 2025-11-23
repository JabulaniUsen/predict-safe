-- Add admin policies for blog_posts table
-- Admins can manage all blog posts (view, insert, update, delete)

-- Admins can view all blog posts (including unpublished)
DROP POLICY IF EXISTS "Admins can view all blog posts" ON blog_posts;
CREATE POLICY "Admins can view all blog posts" ON blog_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can insert blog posts
DROP POLICY IF EXISTS "Admins can insert blog posts" ON blog_posts;
CREATE POLICY "Admins can insert blog posts" ON blog_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can update blog posts
DROP POLICY IF EXISTS "Admins can update blog posts" ON blog_posts;
CREATE POLICY "Admins can update blog posts" ON blog_posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Admins can delete blog posts
DROP POLICY IF EXISTS "Admins can delete blog posts" ON blog_posts;
CREATE POLICY "Admins can delete blog posts" ON blog_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Add index for blog posts slug and published status
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, published_at);

