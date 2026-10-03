-- 033: affiliate/partner link slots on ad_links.
--
-- The admin UI for this table is the "Affiliate/Partners Links" screen:
--   Type     = 'partners' (Partners) | 'menu_link' (Menu Link)
--   Location = 'link_1' (Link 1) | 'link_2' (Link 2)
-- Menu-link rows in Link 1 / Link 2 are the two navbar slots and MUST be
-- rendered as real, crawlable dofollow <a href> backlinks (server-rendered,
-- no rel="nofollow"/"noreferrer"/"sponsored") so they pass ranking signals.
-- Partners rows render on the public /partners page the same way.
--
-- Existing rows predate the type/location concept: they were all navbar
-- links, so they are backfilled as menu_link rows.

ALTER TABLE ad_links
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'menu_link',
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT 'link_1';

-- Normalise any legacy values to the supported vocabularies.
UPDATE ad_links SET type = 'menu_link'
  WHERE type NOT IN ('partners', 'menu_link');
UPDATE ad_links SET location = 'link_1'
  WHERE location NOT IN ('link_1', 'link_2');

-- Enforce the vocabularies going forward (drop first so re-runs are safe).
ALTER TABLE ad_links DROP CONSTRAINT IF EXISTS ad_links_type_check;
ALTER TABLE ad_links ADD CONSTRAINT ad_links_type_check
  CHECK (type IN ('partners', 'menu_link'));

ALTER TABLE ad_links DROP CONSTRAINT IF EXISTS ad_links_location_check;
ALTER TABLE ad_links ADD CONSTRAINT ad_links_location_check
  CHECK (location IN ('link_1', 'link_2'));

CREATE INDEX IF NOT EXISTS idx_ad_links_type_location_active
  ON ad_links(type, location, is_active);
