-- Link Partnerships: reciprocal / exchange link management.
--
-- IMPORTANT: a row in this table is NOT itself a backlink. It is configuration.
-- A real backlink relationship only exists when an <a href> is published and
-- crawlable on a public page (our outgoing link), or when the partner publishes
-- a crawlable link to us on their site (incoming, recorded here for tracking).
--
-- Public read access is limited to rows needed to render placements:
--   status = 'active' (our outgoing link is live on the site).
-- Everything else is admin-only.

CREATE TABLE IF NOT EXISTS link_partnerships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Partner information
  partner_name TEXT NOT NULL,
  partner_domain TEXT NOT NULL,
  partner_website TEXT NOT NULL,

  -- OUR outgoing link (rendered publicly on PredictSafe)
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  placement TEXT NOT NULL DEFAULT 'recommended_platforms',
  link_attribute TEXT NOT NULL DEFAULT 'standard'
    CHECK (link_attribute IN ('standard', 'nofollow', 'sponsored', 'ugc')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'inactive')),
  display_order INTEGER NOT NULL DEFAULT 0,

  -- THEIR reciprocal link to us (tracking only — never rendered publicly)
  their_backlink_url TEXT,
  our_target_url TEXT,
  their_anchor_text TEXT,
  their_link_status TEXT NOT NULL DEFAULT 'expected'
    CHECK (their_link_status IN ('expected', 'confirmed', 'removed')),

  -- Meta
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_partnerships_status
  ON link_partnerships(status);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_placement
  ON link_partnerships(placement);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_status_placement
  ON link_partnerships(status, placement);
CREATE INDEX IF NOT EXISTS idx_link_partnerships_partner_domain
  ON link_partnerships(partner_domain);

ALTER TABLE link_partnerships ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated): can only read ACTIVE outgoing links, and only
-- the columns required to render the anchor. This policy allows row access;
-- the public placement component selects just the render columns.
DROP POLICY IF EXISTS "Active partnerships are viewable by everyone" ON link_partnerships;
CREATE POLICY "Active partnerships are viewable by everyone" ON link_partnerships
  FOR SELECT USING (status = 'active');

-- Admins: full access
DROP POLICY IF EXISTS "Admins can view all link partnerships" ON link_partnerships;
CREATE POLICY "Admins can view all link partnerships" ON link_partnerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can insert link partnerships" ON link_partnerships;
CREATE POLICY "Admins can insert link partnerships" ON link_partnerships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update link partnerships" ON link_partnerships;
CREATE POLICY "Admins can update link partnerships" ON link_partnerships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete link partnerships" ON link_partnerships;
CREATE POLICY "Admins can delete link partnerships" ON link_partnerships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );
