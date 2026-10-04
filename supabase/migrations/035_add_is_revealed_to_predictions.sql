-- =============================================================================
-- 035: Manual reveal switch for tips (Correct Score + Daily 50 Odds Combo).
-- =============================================================================
--
-- Background
-- ----------
-- Tips used to become visible automatically: past games went public as soon as
-- the viewer's local calendar rolled over, so visitors in timezones ahead of
-- Nigeria saw a day's tips and odds before the admin had finished editing
-- them (e.g. correcting a 2-0 to a 3-0). There was no way to hold tips back
-- while editing.
--
-- `is_revealed` puts the admin in control. New predictions are created hidden
-- (`false`); nothing - not subscribers, not past-game history - shows the tip
-- or odds until the admin flips the switch. Existing rows are backfilled to
-- `true` so current history stays visible.
--
-- Read paths treat a missing column as revealed, so the app keeps working
-- until this migration is applied.

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT TRUE;

UPDATE predictions SET is_revealed = TRUE WHERE is_revealed IS NULL;

ALTER TABLE predictions ALTER COLUMN is_revealed SET DEFAULT FALSE;
ALTER TABLE predictions ALTER COLUMN is_revealed SET NOT NULL;

-- Legacy table kept aligned (still read in places).
ALTER TABLE correct_score_predictions ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN DEFAULT TRUE;

UPDATE correct_score_predictions SET is_revealed = TRUE WHERE is_revealed IS NULL;

ALTER TABLE correct_score_predictions ALTER COLUMN is_revealed SET DEFAULT FALSE;
ALTER TABLE correct_score_predictions ALTER COLUMN is_revealed SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_predictions_revealed_date_plan
  ON predictions(prediction_date, plan_type, is_revealed);
