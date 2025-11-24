-- Add scheduling, meta keywords, and tags to blog_posts table
ALTER TABLE blog_posts 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS meta_keywords TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for scheduled posts
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_at ON blog_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;

