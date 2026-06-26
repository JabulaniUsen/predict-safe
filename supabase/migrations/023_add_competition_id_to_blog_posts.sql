ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS competition_id UUID REFERENCES competitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blog_posts_competition_id ON blog_posts(competition_id);
