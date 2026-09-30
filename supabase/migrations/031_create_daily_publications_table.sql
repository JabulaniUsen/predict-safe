-- Daily publications: whole-day publish gate for prediction content.
--
-- WHY THIS EXISTS: public sections used to render anything stored for a
-- calendar date the moment a visitor's local clock passed midnight. Visitors
-- in timezones ahead of the admin therefore saw a new day's predictions
-- before the admin had reviewed/edited them.
--
-- Now nothing prediction-related is served for a date until its row here has
-- is_published = true. No row (a date nobody has touched yet) also means
-- unpublished. The admin publishes a date from Admin -> Predictions once the
-- day's content is final.
--
-- This covers free picks (which otherwise auto-generate on first request),
-- correct-score / VIP predictions, and the subscriber dashboard alike.

CREATE TABLE IF NOT EXISTS daily_publications (
  prediction_date DATE PRIMARY KEY,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE daily_publications ENABLE ROW LEVEL SECURITY;

-- Public: everyone can read publication state (it only reveals whether a
-- date is live, never the predictions themselves).
DROP POLICY IF EXISTS "Publication state is viewable by everyone" ON daily_publications;
CREATE POLICY "Publication state is viewable by everyone" ON daily_publications
  FOR SELECT USING (true);

-- Admins: full write access.
DROP POLICY IF EXISTS "Admins can manage daily publications" ON daily_publications;
CREATE POLICY "Admins can manage daily publications" ON daily_publications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

-- Backfill: every date that already has content was visible under the old
-- behaviour, so mark those dates published to avoid hiding history.
INSERT INTO daily_publications (prediction_date, is_published, published_at)
SELECT prediction_date, true, NOW()
FROM predictions
WHERE prediction_date IS NOT NULL
GROUP BY prediction_date
ON CONFLICT (prediction_date) DO NOTHING;

INSERT INTO daily_publications (prediction_date, is_published, published_at)
SELECT prediction_date, true, NOW()
FROM generated_free_picks
GROUP BY prediction_date
ON CONFLICT (prediction_date) DO NOTHING;
