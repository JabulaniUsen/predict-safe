-- Stamp blog_posts.published_at with the database clock, not the browser's.
-- Run via `supabase db push` or paste into the SQL Editor.
-- Idempotent: safe to run multiple times.
--
-- Why this exists: "published" articles 404'd for hours after publication.
-- The admin write page and the publish toggle stamp published_at from the
-- admin's browser clock, and the publishing device's clock has been running
-- hours fast (published_at landed 8h00m after the server-set created_at on
-- every post in November, ~6h37m in October). The public RLS policy only
-- shows rows with published_at <= NOW(), so each post stayed hidden — and
-- /blog/<slug> 404'd — until real time caught up with the bad stamp. Backdating
-- by 60s in the client (commit 3d93095) can't absorb a skew measured in hours;
-- the only trustworthy clock is the database's.

CREATE OR REPLACE FUNCTION public.blog_posts_stamp_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.published IS TRUE THEN
    IF TG_OP = 'INSERT' OR OLD.published IS NOT TRUE THEN
      -- Going live now: new post, draft -> published, or the scheduler
      -- publishing a scheduled post. Whatever the client sent is ignored.
      NEW.published_at := NOW();
    ELSIF NEW.published_at IS NULL OR NEW.published_at > NOW() THEN
      -- Editing a post that is already live: keep its original publication
      -- date, and never let it be pushed into the future (which would hide
      -- it). A past value is accepted so the date can be corrected by hand.
      NEW.published_at := CASE
        WHEN OLD.published_at IS NOT NULL AND OLD.published_at <= NOW()
          THEN OLD.published_at
        ELSE NOW()
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_stamp_published_at ON blog_posts;
CREATE TRIGGER blog_posts_stamp_published_at
  BEFORE INSERT OR UPDATE OF published, published_at ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_stamp_published_at();

-- updated_at is used as the article's dateModified (structured data) and the
-- sitemap's lastModified, but the generic updated_at trigger fired on every
-- UPDATE — including increment_blog_post_views — so it recorded the last page
-- view, not the last edit. Only bump it when the article itself changes.
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE OF title, slug, content, excerpt, featured_image, author_id,
    published, published_at, scheduled_at, meta_keywords, tags, competition_id
  ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Every existing updated_at is a page-view time, so the real edit times are
-- already gone. Reset to the publication/creation time; edits from here on
-- bump it correctly. (Touches only updated_at, so neither trigger fires.)
UPDATE blog_posts
SET updated_at = COALESCE(published_at, created_at)
WHERE updated_at IS DISTINCT FROM COALESCE(published_at, created_at);
