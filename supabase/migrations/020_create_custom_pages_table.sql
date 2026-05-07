CREATE TABLE IF NOT EXISTS custom_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  heading VARCHAR(255),
  subheading TEXT,
  description TEXT,
  filter_id VARCHAR(50),
  is_published BOOLEAN DEFAULT true,
  show_in_footer BOOLEAN DEFAULT false,
  footer_section VARCHAR(50) DEFAULT 'predictions',
  footer_label VARCHAR(100),
  footer_order INTEGER DEFAULT 0,
  meta_title VARCHAR(255),
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_custom_pages_updated_at BEFORE UPDATE ON custom_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published pages viewable by everyone" ON custom_pages
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can select all custom_pages" ON custom_pages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can insert custom_pages" ON custom_pages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can update custom_pages" ON custom_pages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can delete custom_pages" ON custom_pages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

INSERT INTO custom_pages (slug, title, heading, subheading, description, filter_id, is_published, show_in_footer, footer_section, footer_label, footer_order)
VALUES
  ('safe-free-picks', 'Safe Free Picks', 'Safe Free Picks', 'Low-risk daily football tips', 'Carefully selected low-odds tips with high confidence. Ideal for consistent returns.', 'free', true, true, 'predictions', 'Safe Free Picks', 1),
  ('all-tips', 'All Tips', 'All Tips', 'Full daily coverage across all markets', 'Browse every available prediction across all markets and leagues for today.', 'all', true, true, 'predictions', 'All Tips', 2),
  ('super-single', 'Super Single Tips', 'Super Single', 'The highest-value single tip of the day', 'One standout pick with the best value odds drawn from today''s fixtures.', 'super_single', true, true, 'predictions', 'Super Single', 3),
  ('double-chance', 'Double Chance Tips', 'Double Chance', 'Cover two outcomes with one bet', 'Predictions using the Double Chance market — higher safety, wider coverage.', 'double_chance', true, true, 'predictions', 'Double Chance', 4),
  ('home-win', 'Home Win Tips', 'Home Win Tips', 'Back the home side with confidence', 'Fixtures where the home team is strongly favoured to take all three points.', 'home_win', true, true, 'predictions', 'Home Win', 5),
  ('away-win', 'Away Win Tips', 'Away Win Tips', 'Profit from strong away sides', 'Fixtures where away form and head-to-head data favour the travelling team.', 'away_win', true, true, 'predictions', 'Away Win', 6),
  ('1-5-goals', 'Over 1.5 Goals Tips', 'Over 1.5 Goals', 'At least two goals expected', 'Matches where the data strongly suggests a minimum of two goals will be scored.', 'over_1_5', true, true, 'predictions', '1.5 Goals', 7),
  ('2-5-goals', 'Over 2.5 Goals Tips', 'Over 2.5 Goals', 'High-scoring matches predicted', 'Fixtures where attacking quality and head-to-head trends point to three or more goals.', 'over_2_5', true, true, 'predictions', '2.5 Goals', 8),
  ('btts-gg', 'BTTS / GG Tips', 'Both Teams To Score', 'Goals at both ends', 'Predictions where both teams are expected to find the net — ideal for GG accumulators.', 'btts', true, true, 'predictions', 'BTTS/GG', 9)
ON CONFLICT (slug) DO NOTHING;
