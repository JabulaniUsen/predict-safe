-- Track total views per blog post
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;

-- Increment view count for published posts without exposing broad UPDATE permissions
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(post_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count BIGINT;
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = post_id
    AND published = true
    AND published_at IS NOT NULL
    AND published_at <= NOW()
  RETURNING view_count INTO updated_count;

  RETURN COALESCE(updated_count, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_views(UUID) TO anon, authenticated;
