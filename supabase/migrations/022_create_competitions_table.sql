CREATE TABLE IF NOT EXISTS competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  league_id VARCHAR(50) NOT NULL,
  featured_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  seo_title VARCHAR(255),
  seo_description TEXT,
  heading VARCHAR(255),
  subheading TEXT,
  introduction TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active competitions viewable by everyone" ON competitions
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can select all competitions" ON competitions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can insert competitions" ON competitions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can update competitions" ON competitions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

CREATE POLICY "Admins can delete competitions" ON competitions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('competition-images', 'competition-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies must be created via Supabase Dashboard
-- (Storage > competition-images > Policies):
--
-- POLICY 1: INSERT (authenticated admins)
-- Operation: INSERT, Target roles: authenticated
-- WITH CHECK: bucket_id = 'competition-images'
--
-- POLICY 2: UPDATE (authenticated admins)
-- Operation: UPDATE, Target roles: authenticated
-- USING: bucket_id = 'competition-images'
--
-- POLICY 3: DELETE (authenticated admins)
-- Operation: DELETE, Target roles: authenticated
-- USING: bucket_id = 'competition-images'
--
-- POLICY 4: SELECT (public read)
-- Operation: SELECT, Target roles: public
-- USING: bucket_id = 'competition-images'

INSERT INTO competitions (slug, name, league_id, status, seo_title, seo_description, heading, subheading, introduction, display_order)
VALUES
  ('world-cup', 'World Cup', '1', 'active',
   'FIFA World Cup Predictions, Fixtures, Results & Standings',
   'Latest FIFA World Cup predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'FIFA World Cup', 'Predictions, fixtures, results, standings and match insights.', NULL, 1),
  ('premier-league', 'Premier League', '39', 'active',
   'Premier League Predictions, Fixtures, Results & Standings',
   'Latest Premier League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Premier League', 'Predictions, fixtures, results, standings and match insights.', NULL, 2),
  ('champions-league', 'Champions League', '2', 'active',
   'UEFA Champions League Predictions, Fixtures, Results & Standings',
   'Latest UEFA Champions League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Champions League', 'Predictions, fixtures, results, standings and match insights.', NULL, 3),
  ('europa-league', 'Europa League', '3', 'active',
   'UEFA Europa League Predictions, Fixtures, Results & Standings',
   'Latest UEFA Europa League predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Europa League', 'Predictions, fixtures, results, standings and match insights.', NULL, 4),
  ('afcon', 'AFCON', '6', 'active',
   'AFCON Predictions, Fixtures, Results & Standings',
   'Latest Africa Cup of Nations predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Africa Cup of Nations', 'Predictions, fixtures, results, standings and match insights.', NULL, 5),
  ('euro-cup', 'Euro Cup', '4', 'active',
   'UEFA Euro Predictions, Fixtures, Results & Standings',
   'Latest UEFA European Championship predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'UEFA Euro Championship', 'Predictions, fixtures, results, standings and match insights.', NULL, 6),
  ('club-world-cup', 'Club World Cup', '15', 'active',
   'FIFA Club World Cup Predictions, Fixtures, Results & Standings',
   'Latest FIFA Club World Cup predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'FIFA Club World Cup', 'Predictions, fixtures, results, standings and match insights.', NULL, 7),
  ('la-liga', 'La Liga', '140', 'active',
   'La Liga Predictions, Fixtures, Results & Standings',
   'Latest La Liga predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'La Liga', 'Predictions, fixtures, results, standings and match insights.', NULL, 8),
  ('bundesliga', 'Bundesliga', '78', 'active',
   'Bundesliga Predictions, Fixtures, Results & Standings',
   'Latest Bundesliga predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Bundesliga', 'Predictions, fixtures, results, standings and match insights.', NULL, 9),
  ('serie-a', 'Serie A', '135', 'active',
   'Serie A Predictions, Fixtures, Results & Standings',
   'Latest Serie A predictions, fixtures, results, standings, statistics and match analysis from PredictSafe.',
   'Serie A', 'Predictions, fixtures, results, standings and match insights.', NULL, 10)
ON CONFLICT (slug) DO NOTHING;
