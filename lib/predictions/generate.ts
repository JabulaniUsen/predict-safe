import type { Fixture, Odds } from '@/lib/api-football'

/**
 * Turning provider odds into predictions.
 *
 * Two things this module is deliberate about:
 *
 * 1. **It is a pure function of its inputs.** The same fixtures and odds always
 *    produce the same predictions, in the same order. Predictions used to be
 *    built with `Math.random()` for confidence and with iteration order that
 *    depended on which provider calls happened to succeed, so refreshing a page
 *    could legitimately change what a visitor saw.
 *
 * 2. **No market is invented.** If the provider has not priced a fixture, that
 *    fixture produces nothing. The previous implementation fell back to
 *    "Over 2.5 @ 1.85" for any fixture without odds, which is why almost
 *    everything that came out of "Add with API" was an Over 2.5 tip.
 */

export interface PredictionCandidate {
  /** Stable identifier, used for ordering and for filter matching. */
  market: string
  /** What the user sees, e.g. "Over 2.5". */
  label: string
  odds: number
  /** Vig-adjusted probability, 0-1. */
  probability: number
  /** `probability` as a 0-100 integer. */
  confidence: number
}

export interface GeneratedPrediction {
  match_id: string
  home_team: string
  away_team: string
  home_team_id: string
  away_team_id: string
  league: string
  league_id: string
  prediction_type: string
  market: string
  odds: number
  confidence: number
  kickoff_time: string
  prediction_date: string
  status: 'not_started' | 'live' | 'finished'
  home_team_logo?: string
  away_team_logo?: string
  home_score?: string
  away_score?: string
}

const toOdd = (value: string | undefined): number | null => {
  if (!value) return null
  const parsed = parseFloat(value)
  // Anything at or below evens-on-the-nose 1.0 is not a real price.
  return Number.isFinite(parsed) && parsed > 1 ? parsed : null
}

/**
 * Removes the bookmaker's margin from a set of odds covering every outcome of
 * one market, returning fair probabilities that sum to 1.
 *
 * Raw implied probability (`1 / odds`) overstates every outcome, because the
 * book is priced to sum above 100%. Using it directly would make a 1.90 shot
 * look like a 53% confidence when the fair number is nearer 50%.
 */
function devig(odds: Array<number | null>): Array<number | null> {
  const overround = odds.reduce<number>((sum, o) => (o ? sum + 1 / o : sum), 0)
  if (overround <= 0) return odds.map(() => null)
  return odds.map((o) => (o ? 1 / o / overround : null))
}

function candidate(
  market: string,
  label: string,
  odds: number | null,
  probability: number | null
): PredictionCandidate | null {
  if (!odds || probability === null || !Number.isFinite(probability)) return null
  return {
    market,
    label,
    odds,
    probability,
    confidence: Math.round(probability * 100),
  }
}

/**
 * Every prediction the provider's prices support for one fixture.
 *
 * Returned in a fixed order so that equally-confident candidates always break
 * ties the same way.
 */
export function candidatesForFixture(odds: Odds | undefined | null): PredictionCandidate[] {
  if (!odds) return []
  const out: (PredictionCandidate | null)[] = []

  // --- Match result -----------------------------------------------------
  const home = toOdd(odds.odd_1)
  const draw = toOdd(odds.odd_x)
  const away = toOdd(odds.odd_2)
  const [pHome, pDraw, pAway] = devig([home, draw, away])

  out.push(candidate('home_win', 'Home Win', home, pHome))
  out.push(candidate('away_win', 'Away Win', away, pAway))
  out.push(candidate('draw', 'Draw', draw, pDraw))

  // --- Double chance ----------------------------------------------------
  // Derived from the de-vigged 1X2 book rather than from the double-chance
  // prices, which carry their own (usually larger) margin.
  const dcProb = (a: number | null, b: number | null) => (a !== null && b !== null ? a + b : null)
  out.push(candidate('double_chance_1x', 'Double Chance', toOdd(odds.odd_1x), dcProb(pHome, pDraw)))
  out.push(candidate('double_chance_x2', 'Draw or Away', toOdd(odds.odd_x2), dcProb(pDraw, pAway)))
  out.push(candidate('double_chance_12', 'Home or Away', toOdd(odds.odd_12), dcProb(pHome, pAway)))

  // --- Total goals ------------------------------------------------------
  for (const line of ['0.5', '1.5', '2.5', '3.5']) {
    const over = toOdd(odds[`o+${line}`])
    const under = toOdd(odds[`u+${line}`])
    const [pOver, pUnder] = devig([over, under])
    out.push(candidate(`over_${line.replace('.', '_')}`, `Over ${line}`, over, pOver))
    out.push(candidate(`under_${line.replace('.', '_')}`, `Under ${line}`, under, pUnder))
  }

  // --- Both teams to score ----------------------------------------------
  const bttsYes = toOdd(odds.bts_yes)
  const bttsNo = toOdd(odds.bts_no)
  const [pBttsYes, pBttsNo] = devig([bttsYes, bttsNo])
  out.push(candidate('btts', 'BTTS', bttsYes, pBttsYes))
  out.push(candidate('btts_no', 'BTTS - No', bttsNo, pBttsNo))

  // --- First half -------------------------------------------------------
  const htHome = toOdd(odds.ht_1)
  const htDraw = toOdd(odds.ht_x)
  const htAway = toOdd(odds.ht_2)
  const [pHtHome, pHtDraw, pHtAway] = devig([htHome, htDraw, htAway])
  out.push(candidate('ht_home_win', 'Home Win (HT)', htHome, pHtHome))
  out.push(candidate('ht_draw', 'Draw (HT)', htDraw, pHtDraw))
  out.push(candidate('ht_away_win', 'Away Win (HT)', htAway, pHtAway))

  for (const line of ['0.5', '1.5']) {
    const over = toOdd(odds[`fh_o+${line}`])
    const under = toOdd(odds[`fh_u+${line}`])
    const [pOver, pUnder] = devig([over, under])
    out.push(candidate(`fh_over_${line.replace('.', '_')}`, `Over ${line} (HT)`, over, pOver))
    out.push(candidate(`fh_under_${line.replace('.', '_')}`, `Under ${line} (HT)`, under, pUnder))
  }

  // --- Team totals ------------------------------------------------------
  for (const [prefix, side] of [
    ['home', 'Home'],
    ['away', 'Away'],
  ] as const) {
    for (const line of ['0.5', '1.5']) {
      const over = toOdd(odds[`${prefix}_o+${line}`])
      const under = toOdd(odds[`${prefix}_u+${line}`])
      const [pOver, pUnder] = devig([over, under])
      out.push(
        candidate(
          `${prefix}_over_${line.replace('.', '_')}`,
          `${side} Over ${line}`,
          over,
          pOver
        )
      )
      out.push(
        candidate(
          `${prefix}_under_${line.replace('.', '_')}`,
          `${side} Under ${line}`,
          under,
          pUnder
        )
      )
    }
  }

  // --- Goals odd/even ---------------------------------------------------
  const goalsOdd = toOdd(odds.goals_odd)
  const goalsEven = toOdd(odds.goals_even)
  const [pOdd, pEven] = devig([goalsOdd, goalsEven])
  out.push(candidate('goals_odd', 'Odd Goals', goalsOdd, pOdd))
  out.push(candidate('goals_even', 'Even Goals', goalsEven, pEven))

  // --- Correct score ----------------------------------------------------
  if (Array.isArray(odds.exact_score) && odds.exact_score.length > 0) {
    const scoreOdds = odds.exact_score.map((entry) => toOdd(entry.odd))
    const scoreProbs = devig(scoreOdds)
    odds.exact_score.forEach((entry, index) => {
      out.push(
        candidate(`correct_score_${entry.score}`, entry.score, scoreOdds[index], scoreProbs[index])
      )
    })
  }

  return out.filter((c): c is PredictionCandidate => c !== null)
}

/** Ranks candidates most-confident first, breaking ties deterministically. */
function rankCandidates(candidates: PredictionCandidate[]): PredictionCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    if (a.odds !== b.odds) return a.odds - b.odds
    return a.market.localeCompare(b.market)
  })
}

export interface GenerateOptions {
  /** Only keep tips at or above this confidence (0-100). */
  minConfidence?: number
  minOdds?: number
  maxOdds?: number
  /** Restrict to specific markets, by `PredictionCandidate.market`. */
  markets?: string[]
  /** Only consider correct-score markets (for the Correct Score plan). */
  correctScoreOnly?: boolean
  /** How many tips to take from each fixture. Defaults to 1. */
  perFixture?: number
  /** Cap on the number of predictions returned overall. */
  limit?: number
  /**
   * How the returned list is ordered - and therefore, once `limit` bites,
   * which selections survive.
   *
   * `confidence` suits a "best of the day" shortlist. `kickoff` suits a tip
   * sheet you read through the day: ordering a long list by confidence just
   * collects whatever sits at the minimum-odds floor, so every tip ends up
   * priced the same.
   */
  orderBy?: 'confidence' | 'kickoff'
  /** The date these predictions are being provided for. */
  predictionDate: string
}

/**
 * Markets that are almost always true and priced accordingly.
 *
 * "Over 0.5 goals" at 1.04 is the most *probable* selection on nearly every
 * fixture, so ranking purely by confidence would return it every time - the
 * same failure as the old Over 2.5 fallback, just at the other end of the
 * price range. Nobody wants a tip sheet of 1.04 shots, so these are only
 * offered when explicitly asked for by market, never picked as "best
 * available".
 */
const LOW_VALUE_MARKETS = new Set([
  'over_0_5',
  'under_0_5',
  'fh_over_0_5',
  'fh_under_0_5',
  'home_over_0_5',
  'home_under_0_5',
  'away_over_0_5',
  'away_under_0_5',
])

/**
 * The shortest price worth publishing as a tip when the caller hasn't said
 * otherwise. Anything below this returns so little that it isn't a prediction
 * so much as a statement of the obvious.
 */
const DEFAULT_MIN_ODDS = 1.2

/**
 * The weakest selection worth publishing as a tip.
 *
 * Single-market sheets ("Home Win", say) would otherwise list every fixture on
 * the card, including 20%-probability outsiders. Showing those as predictions
 * is worse than showing fewer tips.
 */
const DEFAULT_MIN_CONFIDENCE = 40

function matchesMarketFilter(candidate: PredictionCandidate, options: GenerateOptions): boolean {
  if (options.correctScoreOnly) return candidate.market.startsWith('correct_score_')
  // Correct-score tips are only ever offered when they're asked for - they're
  // long-odds by nature and would otherwise crowd out everything else.
  if (candidate.market.startsWith('correct_score_')) return false

  const explicitMarkets = options.markets && options.markets.length > 0
  if (explicitMarkets) {
    return options.markets!.includes(candidate.market)
  }

  return !LOW_VALUE_MARKETS.has(candidate.market)
}

/**
 * Builds predictions from fixtures and their odds.
 *
 * Fixtures with no priced markets are skipped entirely rather than being given
 * a placeholder tip.
 */
export function buildPredictions(
  fixtures: Fixture[],
  oddsByMatchId: Map<string, Odds>,
  options: GenerateOptions
): GeneratedPrediction[] {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minOdds = DEFAULT_MIN_ODDS,
    maxOdds,
    perFixture = 1,
    limit,
    orderBy = 'confidence',
    predictionDate,
  } = options

  const predictions: GeneratedPrediction[] = []

  // Sort the fixtures themselves so the output order never depends on the
  // order the provider happened to return leagues in.
  const orderedFixtures = [...fixtures].sort((a, b) => {
    const timeA = `${a.match_date} ${a.match_time}`
    const timeB = `${b.match_date} ${b.match_time}`
    if (timeA !== timeB) return timeA.localeCompare(timeB)
    return String(a.match_id).localeCompare(String(b.match_id))
  })

  for (const fixture of orderedFixtures) {
    const odds = oddsByMatchId.get(fixture.match_id)
    if (!odds) continue

    const eligible = rankCandidates(
      candidatesForFixture(odds).filter((c) => {
        if (!matchesMarketFilter(c, options)) return false
        if (c.confidence < minConfidence) return false
        if (c.odds < minOdds) return false
        if (maxOdds !== undefined && c.odds > maxOdds) return false
        return true
      })
    ).slice(0, Math.max(1, perFixture))

    for (const pick of eligible) {
      predictions.push({
        match_id: fixture.match_id,
        home_team: fixture.match_hometeam_name || 'Home Team',
        away_team: fixture.match_awayteam_name || 'Away Team',
        home_team_id: fixture.match_hometeam_id || '',
        away_team_id: fixture.match_awayteam_id || '',
        league: fixture.league_name || 'Unknown League',
        league_id: fixture.league_id || '',
        prediction_type: pick.label,
        market: pick.market,
        odds: pick.odds,
        confidence: pick.confidence,
        kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}:00`,
        prediction_date: predictionDate,
        status:
          fixture.match_status === 'Finished'
            ? 'finished'
            : fixture.match_live === '1'
              ? 'live'
              : 'not_started',
        home_team_logo: fixture.team_home_badge,
        away_team_logo: fixture.team_away_badge,
        home_score: fixture.match_hometeam_score || undefined,
        away_score: fixture.match_awayteam_score || undefined,
      })
    }
  }

  predictions.sort((a, b) => {
    if (orderBy === 'kickoff') {
      if (a.kickoff_time !== b.kickoff_time) return a.kickoff_time.localeCompare(b.kickoff_time)
      if (b.confidence !== a.confidence) return b.confidence - a.confidence
      return a.match_id.localeCompare(b.match_id)
    }

    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    if (a.kickoff_time !== b.kickoff_time) return a.kickoff_time.localeCompare(b.kickoff_time)
    return a.match_id.localeCompare(b.match_id)
  })

  return limit !== undefined ? predictions.slice(0, limit) : predictions
}
