import {
  FREE_PLAN_LEAGUES,
  getFixtures,
  getOddsByLeague,
  type Fixture,
  type Odds,
} from '@/lib/api-football'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { buildPredictions, type GeneratedPrediction } from '@/lib/predictions/generate'

/**
 * The free / tips filters offered on the homepage and the /tips pages, and the
 * markets each one draws from.
 *
 * These used to be hard-coded twice - once in the homepage section and again in
 * the tips section - with slightly different buffers and limits in each, so the
 * same filter behaved differently depending on which page you were on.
 */
export interface FreePickFilter {
  id: string
  label: string
  slug: string
  markets?: string[]
  minOdds?: number
  maxOdds?: number
  minConfidence?: number
  limit: number
  /**
   * Defaults to 'confidence'. The browsable tip sheets use 'kickoff' so the
   * list reads as a day's fixtures rather than as 20 selections that all
   * happen to sit at the minimum price.
   */
  orderBy?: 'confidence' | 'kickoff'
}

export const FREE_PICK_FILTERS: FreePickFilter[] = [
  {
    id: 'free',
    label: 'Safe free picks',
    slug: 'safe-free-picks',
    // Short-priced selections only - this is the "safe" list.
    markets: ['home_win', 'away_win', 'over_1_5', 'double_chance_1x'],
    minOdds: 1.2,
    maxOdds: 1.7,
    limit: 5,
  },
  {
    id: 'all',
    label: 'All Tips',
    slug: 'all-tips',
    // A band that keeps the list to selections worth actually backing, rather
    // than a page of near-certainties at 1.05.
    minOdds: 1.3,
    maxOdds: 3.5,
    limit: 30,
    orderBy: 'kickoff',
  },
  {
    id: 'super_single',
    label: 'Super Single',
    slug: 'super-single',
    markets: ['home_win', 'away_win', 'over_1_5', 'over_2_5', 'double_chance_1x'],
    minConfidence: 65,
    minOdds: 1.3,
    limit: 10,
  },
  // Single-market sheets: a reader browsing "Home Win" wants the day's
  // fixtures in order, not the twenty shortest prices on the card.
  {
    id: 'double_chance',
    label: 'Double Chance',
    slug: 'double-chance',
    markets: ['double_chance_1x', 'double_chance_x2', 'double_chance_12'],
    limit: 20,
    orderBy: 'kickoff',
  },
  {
    id: 'home_win',
    label: 'Home Win',
    slug: 'home-win',
    markets: ['home_win'],
    limit: 20,
    orderBy: 'kickoff',
  },
  {
    id: 'away_win',
    label: 'Away Win',
    slug: 'away-win',
    markets: ['away_win'],
    limit: 20,
    orderBy: 'kickoff',
  },
  {
    id: 'over_1_5',
    label: '1.5 Goals',
    slug: '1-5-goals',
    markets: ['over_1_5'],
    limit: 20,
    orderBy: 'kickoff',
  },
  {
    id: 'over_2_5',
    label: '2.5 Goals',
    slug: '2-5-goals',
    markets: ['over_2_5'],
    limit: 20,
    orderBy: 'kickoff',
  },
  {
    id: 'btts',
    label: 'BTTS/GG',
    slug: 'btts-gg',
    markets: ['btts'],
    limit: 20,
    orderBy: 'kickoff',
  },
]

export function findFreePickFilter(id: string): FreePickFilter {
  return FREE_PICK_FILTERS.find((f) => f.id === id) || FREE_PICK_FILTERS[0]
}

export interface FreePicksResult {
  picks: GeneratedPrediction[]
  leaguesTotal: number
  leaguesSucceeded: number
}

/**
 * Builds the free picks for one date and filter.
 *
 * Runs on the server only. Previously this ran in each visitor's browser, and
 * any league whose request failed or was rate-limited was silently swallowed
 * with `.catch(() => [])` - so two devices asking for the same date genuinely
 * received different picks, and a refresh could change them again.
 *
 * Failures are now counted and reported rather than hidden, so a partial set
 * can be identified and rebuilt instead of being cached as though it were
 * complete.
 */
export async function generateFreePicks(
  date: string,
  filterId: string
): Promise<FreePicksResult> {
  const filter = findFreePickFilter(filterId)

  let leaguesSucceeded = 0
  const leagueFixtures = await mapWithConcurrency(FREE_PLAN_LEAGUES, 6, async (leagueId) => {
    try {
      const fixtures = await getFixtures(date, leagueId, date)
      leaguesSucceeded++
      return Array.isArray(fixtures) ? fixtures : []
    } catch (error) {
      console.error(`[free-picks] league ${leagueId} fixtures failed for ${date}:`, error)
      return [] as Fixture[]
    }
  })

  let fixtures: Fixture[] = leagueFixtures.flat()
  let leaguesTotal = FREE_PLAN_LEAGUES.length

  // If the curated leagues have nothing for this date - off-season, or an
  // international break - widen to every league so the page isn't empty.
  if (fixtures.length === 0) {
    try {
      const allFixtures = await getFixtures(date, undefined, date)
      if (Array.isArray(allFixtures) && allFixtures.length > 0) {
        fixtures = allFixtures
        leaguesTotal = 1
        leaguesSucceeded = 1
      }
    } catch (error) {
      console.error(`[free-picks] all-league fixture fallback failed for ${date}:`, error)
    }
  }

  if (fixtures.length === 0) {
    return { picks: [], leaguesTotal, leaguesSucceeded }
  }

  // One odds request per league/date pair covers every fixture in it.
  const leagueDatePairs = new Map<string, { leagueId: string; date: string }>()
  fixtures.forEach((f) => {
    if (!f.league_id || !f.match_date) return
    leagueDatePairs.set(`${f.league_id}|${f.match_date}`, {
      leagueId: f.league_id,
      date: f.match_date,
    })
  })

  const oddsResults = await mapWithConcurrency(
    Array.from(leagueDatePairs.values()),
    6,
    async ({ leagueId, date: leagueDate }) => {
      try {
        return await getOddsByLeague(leagueId, leagueDate)
      } catch (error) {
        console.error(`[free-picks] odds for league ${leagueId} failed:`, error)
        return [] as Odds[]
      }
    }
  )

  const oddsByMatchId = new Map<string, Odds>()
  oddsResults.flat().forEach((odds) => {
    if (odds.match_id) oddsByMatchId.set(odds.match_id, odds)
  })

  const picks = buildPredictions(fixtures, oddsByMatchId, {
    predictionDate: date,
    markets: filter.markets,
    minOdds: filter.minOdds,
    maxOdds: filter.maxOdds,
    minConfidence: filter.minConfidence,
    perFixture: 1,
    limit: filter.limit,
    orderBy: filter.orderBy,
  })

  return { picks, leaguesTotal, leaguesSucceeded }
}

/**
 * Refreshes the live parts of a stored pick - status and score - from the
 * current fixture list, leaving the selection itself untouched.
 *
 * The selection is what must never change between refreshes; the scoreline
 * obviously should.
 */
export function applyLiveFixtureState(
  picks: GeneratedPrediction[],
  fixtures: Fixture[]
): GeneratedPrediction[] {
  if (fixtures.length === 0) return picks

  const byId = new Map(fixtures.map((f) => [String(f.match_id), f]))

  return picks.map((pick) => {
    const fixture = byId.get(String(pick.match_id))
    if (!fixture) return pick

    return {
      ...pick,
      status:
        fixture.match_status === 'Finished'
          ? 'finished'
          : fixture.match_live === '1'
            ? 'live'
            : 'not_started',
      home_score: fixture.match_hometeam_score || undefined,
      away_score: fixture.match_awayteam_score || undefined,
      home_team_logo: fixture.team_home_badge || pick.home_team_logo,
      away_team_logo: fixture.team_away_badge || pick.away_team_logo,
    }
  })
}
