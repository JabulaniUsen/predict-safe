-- =============================================================================
-- 028: A single source of truth for "which day does this prediction belong to",
--      plus the fields needed to render a VIP win as a real betting ticket.
-- =============================================================================
--
-- Background
-- ----------
-- Every section of the site (VIP dashboard, Daily 50 Odds Combo, Correct Score,
-- Previous Winning, VIP user history) used to work out a prediction's date by
-- re-deriving it from `kickoff_time` at read time. Each section did that
-- slightly differently - some in UTC, some in the viewer's local timezone, some
-- against a different table entirely - so the same calendar date returned a
-- different set of games depending on where you looked at it from.
--
-- The fix is to stop deriving the date at read time. `prediction_date` is
-- written once, when the prediction is created, and every section filters on
-- that column. A prediction provided on 23 August stays on 23 August for every
-- viewer in every timezone, regardless of when its match actually kicks off.

-- -----------------------------------------------------------------------------
-- predictions
-- -----------------------------------------------------------------------------

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS prediction_date DATE;

-- Provider identifiers. These used to be stripped out before insert, which left
-- the frontend fuzzy-matching predictions back to fixtures on team-name
-- substrings - the reason scores occasionally attached to the wrong match.
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS match_id VARCHAR(50);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS home_team_id VARCHAR(50);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS away_team_id VARCHAR(50);

-- Backfill: existing rows adopt the UTC calendar date of their kickoff, which
-- is what the majority of the read paths were already (inconsistently) using.
UPDATE predictions
SET prediction_date = (kickoff_time AT TIME ZONE 'UTC')::date
WHERE prediction_date IS NULL;

-- From here on a prediction always has a date. Defaulting to the kickoff date
-- keeps any insert that doesn't set it explicitly consistent with the backfill.
ALTER TABLE predictions ALTER COLUMN prediction_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_prediction_date ON predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_predictions_date_plan ON predictions(prediction_date, plan_type);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);

-- -----------------------------------------------------------------------------
-- correct_score_predictions
-- -----------------------------------------------------------------------------
-- Correct scores are written to `predictions` with plan_type = 'correct_score'
-- these days, but the legacy table is still read in places, so keep it aligned.

ALTER TABLE correct_score_predictions ADD COLUMN IF NOT EXISTS prediction_date DATE;
ALTER TABLE correct_score_predictions ADD COLUMN IF NOT EXISTS match_id VARCHAR(50);

UPDATE correct_score_predictions
SET prediction_date = (kickoff_time AT TIME ZONE 'UTC')::date
WHERE prediction_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_correct_score_prediction_date
  ON correct_score_predictions(prediction_date);

-- -----------------------------------------------------------------------------
-- vip_winnings
-- -----------------------------------------------------------------------------
-- The Previous VIP Winning section showed only teams / league / tip / result,
-- which doesn't read as a betting record. These columns carry the rest of the
-- ticket: what the odds were and how the match actually finished.

ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS odds DECIMAL(6, 2);
ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS home_score INTEGER;
ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS away_score INTEGER;
ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS league_id VARCHAR(50);
ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS match_id VARCHAR(50);
ALTER TABLE vip_winnings ADD COLUMN IF NOT EXISTS kickoff_time TIMESTAMP WITH TIME ZONE;

-- Links a win back to the prediction it came from, so "Previous Winning" for a
-- date and "the predictions given on that date" can never drift apart.
ALTER TABLE vip_winnings
  ADD COLUMN IF NOT EXISTS prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vip_winnings_prediction_id ON vip_winnings(prediction_id);

-- Migration 027 renamed the plan in the `plans` table but not the free-text
-- `plan_name` copied onto historical wins, so the homepage still grouped old
-- rows under the previous name.
UPDATE vip_winnings
SET plan_name = 'Daily 50 Odds Combo'
WHERE plan_name IN ('Profit Multiplier', 'profit multiplier', 'Profit multiplier');

-- -----------------------------------------------------------------------------
-- generated_free_picks
-- -----------------------------------------------------------------------------
-- Free / Safe picks used to be generated in the visitor's browser on every page
-- load, straight from the odds provider. Any league that rate-limited was
-- silently dropped, so two devices - or two refreshes on one device - legitimately
-- produced different picks for the same date and filter.
--
-- Now they're generated once, server-side, and stored here. Every visitor for a
-- given (date, filter) is served the identical stored row.

CREATE TABLE IF NOT EXISTS generated_free_picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_date DATE NOT NULL,
  filter_id VARCHAR(50) NOT NULL,
  picks JSONB NOT NULL,
  -- How complete the provider data was when this set was built. A set built
  -- while leagues were failing can be rebuilt later; a complete one is final.
  leagues_total INTEGER NOT NULL DEFAULT 0,
  leagues_succeeded INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(prediction_date, filter_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_free_picks_lookup
  ON generated_free_picks(prediction_date, filter_id);

ALTER TABLE generated_free_picks ENABLE ROW LEVEL SECURITY;

-- Free picks are public content - anyone may read them. Writes happen through
-- the service role in the generation route only, never from the client.
DROP POLICY IF EXISTS "Free picks are viewable by everyone" ON generated_free_picks;
CREATE POLICY "Free picks are viewable by everyone" ON generated_free_picks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage free picks" ON generated_free_picks;
CREATE POLICY "Admins can manage free picks" ON generated_free_picks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_admin = true
    )
  );

DROP TRIGGER IF EXISTS update_generated_free_picks_updated_at ON generated_free_picks;
CREATE TRIGGER update_generated_free_picks_updated_at
  BEFORE UPDATE ON generated_free_picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
