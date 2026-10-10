import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures, getOddsByLeague, FREE_PLAN_LEAGUES, Odds } from '@/lib/api-football'
import { notifyPredictionDropped } from '@/lib/notifications'
import { PLAN_TYPE_TO_SLUG } from '@/lib/constants'
import { mapWithConcurrency } from '@/lib/utils/concurrency'
import { buildPredictions } from '@/lib/predictions/generate'
import { PREDICTION_INSERT_COLUMNS } from '@/lib/predictions/columns'

/**
 * "Add with API" - builds a day's predictions from the odds provider.
 *
 * This used to iterate a handful of markets, assign each one a `Math.random()`
 * confidence between 70 and 100, and - for any fixture the provider hadn't
 * priced - fall back to inventing an "Over 2.5 @ 1.85" tip. That fallback is
 * why the output was overwhelmingly Over 2.5, and the random confidence made
 * the minimum-confidence filter meaningless.
 *
 * Selection now happens in `lib/predictions/generate.ts`: real markets only,
 * confidence derived from vig-adjusted implied probability, and one best tip
 * per fixture rather than every market on every fixture.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      planType = 'free',
      // Correct-score fair probabilities sit around 5-15% (the book splits
      // ~100% across 15+ scorelines), so the standard 50% default would reject
      // every correct-score candidate. Default it to 8% when the caller
      // doesn't send an explicit threshold.
      minConfidence: rawMinConfidence,
      minOdds,
      maxOdds,
      markets,
      perFixture = 1,
      limit,
      preview = false,
      strategy = 'safest',
      // Kickoff window in UTC hours (provider match_time is UTC "HH:MM").
      // The admin asked for evening games only (4-11pm WAT = 15-22 UTC) -
      // morning games are already finished by the time tips go out and just
      // burn odds quota. Null/undefined means no time filtering.
      fromHour,
      toHour,
      // Skip finished/live fixtures. Morning games that already kicked off
      // can never become user tips, so pricing them wastes provider calls.
      upcomingOnly = true,
    } = body

    const isCorrectScorePlan = planType === 'correct_score'
    const defaultConfidence = isCorrectScorePlan ? 8 : 50
    const minConfidence = rawMinConfidence ?? defaultConfidence

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    const confidenceThreshold = Math.max(0, Math.min(100, parseInt(minConfidence) || 0))

    const pickStrategy = strategy === 'biggest_odds' ? 'biggest_odds' : 'safest'

    const minOddsValue = minOdds !== undefined && minOdds !== null ? parseFloat(minOdds) : null
    const maxOddsValue = maxOdds !== undefined && maxOdds !== null ? parseFloat(maxOdds) : null

    if (minOddsValue !== null && maxOddsValue !== null && minOddsValue >= maxOddsValue) {
      return NextResponse.json({ error: 'minOdds must be less than maxOdds' }, { status: 400 })
    }

    const parseHour = (value: unknown): number | null => {
      if (value === undefined || value === null || value === '') return null
      const parsed = parseInt(String(value), 10)
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 23) return Number.NaN
      return parsed
    }
    const fromHourValue = parseHour(fromHour)
    const toHourValue = parseHour(toHour)
    if (Number.isNaN(fromHourValue) || Number.isNaN(toHourValue)) {
      return NextResponse.json({ error: 'fromHour and toHour must be hours 0-23' }, { status: 400 })
    }
    const hasWindow = fromHourValue !== null && toHourValue !== null

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile || !(userProfile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const fixtures = await getFixtures(date)

    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return NextResponse.json({ message: 'No fixtures found', synced: 0 })
    }

    // Narrow the slate BEFORE touching the odds provider. The old code priced
    // every league on the card (~370 on a busy Saturday), blew through the
    // per-minute rate limit, and came back with a handful of priced matches
    // and hundreds of failed leagues. Morning games that already finished can
    // never become tips, so they are dropped here rather than priced.
    const kickoffHour = (matchTime: string): number | null => {
      const match = /^(\d{1,2}):(\d{2})/.exec(matchTime || '')
      if (!match) return null
      const hour = parseInt(match[1], 10)
      return hour >= 0 && hour <= 23 ? hour : null
    }
    const inWindow = (hour: number | null): boolean => {
      if (!hasWindow || hour === null) return true
      const from = fromHourValue as number
      const to = toHourValue as number
      // Overnight windows (e.g. 22-02) wrap past midnight.
      return from <= to ? hour >= from && hour <= to : hour >= from || hour <= to
    }

    let skippedFinished = 0
    let skippedTime = 0
    const eligibleFixtures = fixtures.filter((f) => {
      if (upcomingOnly && (f.match_status === 'Finished' || f.match_live === '1')) {
        skippedFinished++
        return false
      }
      if (hasWindow && !inWindow(kickoffHour(f.match_time))) {
        skippedTime++
        return false
      }
      return true
    })

    if (eligibleFixtures.length === 0) {
      return NextResponse.json({
        message: 'No fixtures left after kickoff filters',
        synced: 0,
        predictions: preview ? [] : undefined,
        fixturesConsidered: fixtures.length,
        fixturesEligible: 0,
        fixturesPriced: 0,
        leaguesFailed: 0,
        skippedFinished,
        skippedTime,
      })
    }

    // Odds come back per league/date rather than per fixture: a busy day has
    // hundreds of fixtures but only a couple of dozen distinct leagues.
    const leagueDatePairs = new Map<string, { leagueId: string; date: string }>()
    eligibleFixtures.forEach((f) => {
      if (!f.league_id || !f.match_date) return
      leagueDatePairs.set(`${f.league_id}|${f.match_date}`, {
        leagueId: f.league_id,
        date: f.match_date,
      })
    })

    let leaguesFailed = 0
    const oddsErrorSamples = new Map<string, number>()
    const recordOddsError = (leagueId: string, oddsError: unknown) => {
      leaguesFailed++
      const msg =
        oddsError instanceof Error ? oddsError.message : String(oddsError ?? 'unknown error')
      // Distinguish "daily quota exhausted" from "throttled this minute" -
      // the admin needs to know which one they're looking at.
      const short =
        msg.length > 160 ? `${msg.slice(0, 160)}…` : msg
      oddsErrorSamples.set(short, (oddsErrorSamples.get(short) ?? 0) + 1)
      console.error(`Error fetching odds for league ${leagueId}:`, oddsError)
    }

    // Rank leagues before pricing: curated leagues and the leagues with the
    // most evening fixtures go first. The provider throttles when too many
    // leagues are asked for at once, and whatever gets throttled comes back
    // with no odds - so failures should land on the least valuable leagues,
    // not on a random draw.
    const curated = new Set(FREE_PLAN_LEAGUES)
    const eligibleCountByLeague = new Map<string, number>()
    eligibleFixtures.forEach((f) => {
      if (!f.league_id) return
      eligibleCountByLeague.set(f.league_id, (eligibleCountByLeague.get(f.league_id) ?? 0) + 1)
    })
    const rankedPairs = Array.from(leagueDatePairs.values()).sort((a, b) => {
      const aCurated = curated.has(a.leagueId) ? 0 : 1
      const bCurated = curated.has(b.leagueId) ? 0 : 1
      if (aCurated !== bCurated) return aCurated - bCurated
      return (
        (eligibleCountByLeague.get(b.leagueId) ?? 0) -
        (eligibleCountByLeague.get(a.leagueId) ?? 0)
      )
    })

    const fetchOdds = async (
      { leagueId, date: leagueDate }: { leagueId: string; date: string },
      silent = false
    ) => {
      try {
        return { ok: true as const, odds: await getOddsByLeague(leagueId, leagueDate) }
      } catch (oddsError) {
        // Retries must not double-count a league that already failed - it
        // keeps its single failure unless the retry succeeds.
        if (!silent) recordOddsError(leagueId, oddsError)
        else console.error(`Retry failed for league ${leagueId}:`, oddsError)
        return { ok: false as const, leagueId, date: leagueDate, odds: [] as Odds[] }
      }
    }

    // Concurrency 3, not 6: each league costs 1+ provider calls and the
    // per-minute quota is tight. Bursting harder just converts priced matches
    // into failed leagues.
    const firstPass = await mapWithConcurrency(rankedPairs, 3, (pair) => fetchOdds(pair))

    // One recovery round for throttled leagues: per-minute limits reset
    // quickly, and by now minutes have passed since the first attempts.
    // Concurrency 2 to stay well under the limit this time.
    const failedPairs = firstPass
      .filter((r) => !r.ok)
      .map((r) => ({ leagueId: (r as { leagueId: string }).leagueId, date: (r as { date: string }).date }))
    let leaguesRecovered = 0
    let secondPass: typeof firstPass = []
    if (failedPairs.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000))
      secondPass = await mapWithConcurrency(failedPairs, 2, async (pair) => {
        const result = await fetchOdds(pair, true)
        if (result.ok) {
          leaguesFailed--
          leaguesRecovered++
        }
        return result
      })
    }

    const oddsResults = [...firstPass, ...secondPass]
      .filter((r) => r.ok)
      .map((r) => r.odds)
    const topOddsError =
      [...oddsErrorSamples.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    const oddsByMatchId = new Map<string, Odds>()
    oddsResults.flat().forEach((odds) => {
      if (odds.match_id) oddsByMatchId.set(odds.match_id, odds)
    })

    const isCorrectScore = planType === 'correct_score'

    const generated = buildPredictions(eligibleFixtures, oddsByMatchId, {
      predictionDate: date,
      minConfidence: confidenceThreshold,
      minOdds: minOddsValue ?? undefined,
      maxOdds: maxOddsValue ?? undefined,
      markets: Array.isArray(markets) && markets.length > 0 ? markets : undefined,
      correctScoreOnly: isCorrectScore,
      perFixture: Math.max(1, Math.min(5, Number(perFixture) || 1)),
      limit: limit !== undefined ? Math.max(1, Number(limit)) : undefined,
      strategy: pickStrategy,
    })

    const predictions = generated.map((pred) => ({
      ...pred,
      plan_type: planType,
      // For correct score the "tip" is the scoreline itself, which is already
      // what `prediction_type` carries.
      prediction_type: pred.prediction_type,
    }))

    if (preview) {
      return NextResponse.json({
        message: 'Predictions fetched successfully',
        predictions,
        preview: true,
        fixturesConsidered: fixtures.length,
        fixturesEligible: eligibleFixtures.length,
        fixturesPriced: oddsByMatchId.size,
        leaguesFailed,
        leaguesRecovered,
        oddsErrorSample: topOddsError,
        skippedFinished,
        skippedTime,
        minConfidence: confidenceThreshold,
        minOdds: minOddsValue,
        maxOdds: maxOddsValue,
      })
    }

    const cleanedPredictions = predictions.map((pred: any) => {
      const cleaned: any = {}
      PREDICTION_INSERT_COLUMNS.forEach((col) => {
        if (pred[col] !== undefined && pred[col] !== null) {
          cleaned[col] = pred[col]
        }
      })
      // API-synced tips start hidden so the admin can review/edit before
      // revealing (migration 035). Dropped when the column doesn't exist yet.
      if (!('is_revealed' in cleaned)) cleaned.is_revealed = false
      return cleaned
    })

    if (cleanedPredictions.length === 0) {
      return NextResponse.json({
        message: 'No predictions matched the selected filters',
        synced: 0,
        fixturesConsidered: fixtures.length,
        fixturesEligible: eligibleFixtures.length,
        fixturesPriced: oddsByMatchId.size,
        leaguesFailed,
        leaguesRecovered,
        oddsErrorSample: topOddsError,
        skippedFinished,
        skippedTime,
      })
    }

    const { data, error } = await supabase
      .from('predictions')
      .insert(cleanedPredictions as any)
      .select()

    if (error) {
      console.error('Error inserting predictions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data && data.length > 0) {
      try {
        const planSlug = PLAN_TYPE_TO_SLUG[planType]
        if (planSlug) {
          const planResult: any = await supabase
            .from('plans')
            .select('id, name')
            .eq('slug', planSlug)
            .single()
          const planData = planResult.data as { id: string; name: string } | null

          if (planData) {
            await notifyPredictionDropped(planData.id, planData.name)
          }
        }
      } catch (notifyError) {
        console.error('Error notifying users:', notifyError)
        // A failed notification must not fail the sync.
      }
    }

    return NextResponse.json({
      message: 'Predictions synced successfully',
      synced: data?.length || 0,
      fixturesConsidered: fixtures.length,
      fixturesEligible: eligibleFixtures.length,
      fixturesPriced: oddsByMatchId.size,
      leaguesFailed,
      leaguesRecovered,
      oddsErrorSample: topOddsError,
      skippedFinished,
      skippedTime,
      minConfidence: confidenceThreshold,
      minOdds: minOddsValue,
      maxOdds: maxOddsValue,
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
