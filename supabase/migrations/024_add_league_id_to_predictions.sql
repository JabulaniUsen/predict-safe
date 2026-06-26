ALTER TABLE predictions ADD COLUMN IF NOT EXISTS league_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_predictions_league_id ON predictions(league_id);
