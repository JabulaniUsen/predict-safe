/**
 * Matching a stored prediction back to a provider fixture.
 *
 * Predictions used to be saved without the provider's `match_id`, so every
 * screen that wanted a badge or a final score had to re-find the fixture by
 * comparing team names with `includes()` in both directions. That matches far
 * too eagerly - "United" finds Manchester United, Newcastle United and Leeds
 * United alike - which is how scores occasionally landed on the wrong match.
 *
 * `match_id` is now stored (migration 028), so it's used whenever it's there.
 * The name comparison is kept for rows created before that, but tightened:
 * names are normalised and then required to match exactly, or one must contain
 * the other *as a whole word*.
 */

export interface MatchableFixture {
  match_id?: string | null
  match_hometeam_name?: string | null
  match_awayteam_name?: string | null
}

export interface MatchablePrediction {
  match_id?: string | null
  home_team: string
  away_team: string
}

/**
 * Strips accents, punctuation and the boilerplate that clubs carry in one data
 * source but not another ("FC", "AFC", "CF", "SC"), so "Atlético Madrid" and
 * "Atletico Madrid CF" compare equal.
 */
function normalizeTeamName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(fc|afc|cf|sc|ac|ss|as|sv|bk|if|fk|cd|ca|club|de|futbol|football)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when one name contains the other as a whole word, not mid-word. */
function containsAsWords(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false
  if (haystack === needle) return true
  // Require the shorter name to be at least two characters of signal, so a
  // stray token can't match half the fixture list.
  if (needle.length < 4) return false
  return new RegExp(`(^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|\\s)`).test(haystack)
}

function teamNamesAgree(fixtureName: string | null | undefined, predictionName: string): boolean {
  const a = normalizeTeamName(fixtureName)
  const b = normalizeTeamName(predictionName)
  if (!a || !b) return false
  return a === b || containsAsWords(a, b) || containsAsWords(b, a)
}

/**
 * Finds the fixture a prediction refers to, or `null` when there's no
 * confident match. Returning `null` is deliberate - showing no score is better
 * than showing another match's score.
 */
export function findFixtureForPrediction<T extends MatchableFixture>(
  fixtures: T[],
  prediction: MatchablePrediction
): T | null {
  if (!Array.isArray(fixtures) || fixtures.length === 0) return null

  // Exact provider id - unambiguous, so no name comparison needed.
  if (prediction.match_id) {
    const byId = fixtures.find((f) => f.match_id && String(f.match_id) === String(prediction.match_id))
    if (byId) return byId
  }

  const candidates = fixtures.filter(
    (f) =>
      teamNamesAgree(f.match_hometeam_name, prediction.home_team) &&
      teamNamesAgree(f.match_awayteam_name, prediction.away_team)
  )

  // More than one fixture fitting the names means we can't tell them apart.
  return candidates.length === 1 ? candidates[0] : null
}

export { normalizeTeamName }
