/**
 * The `predictions` columns an insert is allowed to set.
 *
 * Generated prediction objects carry presentation extras (team badges, the
 * internal market id, live scores) that aren't columns, so inserts are filtered
 * through this list. It lives here rather than being repeated in each route,
 * because the two copies had already drifted - one of them dropped `match_id`,
 * `home_team_id` and `away_team_id`, which is why stored predictions couldn't
 * be matched back to their fixture except by comparing team names.
 */
export const PREDICTION_INSERT_COLUMNS = [
  'plan_type',
  'prediction_date',
  'home_team',
  'away_team',
  'league',
  'league_id',
  'match_id',
  'home_team_id',
  'away_team_id',
  'prediction_type',
  'odds',
  'confidence',
  'kickoff_time',
  'status',
  'result',
  'admin_notes',
] as const

export type PredictionInsertColumn = (typeof PREDICTION_INSERT_COLUMNS)[number]
