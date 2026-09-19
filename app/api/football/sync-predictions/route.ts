import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFixtures, getOddsByLeague, Odds } from '@/lib/api-football'
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
      minConfidence = 50,
      minOdds,
      maxOdds,
      markets,
      perFixture = 1,
      limit,
      preview = false,
    } = body

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    const confidenceThreshold = Math.max(0, Math.min(100, parseInt(minConfidence) || 0))

    const minOddsValue = minOdds !== undefined && minOdds !== null ? parseFloat(minOdds) : null
    const maxOddsValue = maxOdds !== undefined && maxOdds !== null ? parseFloat(maxOdds) : null

    if (minOddsValue !== null && maxOddsValue !== null && minOddsValue >= maxOddsValue) {
      return NextResponse.json({ error: 'minOdds must be less than maxOdds' }, { status: 400 })
    }

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

    // Odds come back per league/date rather than per fixture: a busy day has
    // hundreds of fixtures but only a couple of dozen distinct leagues.
    const leagueDatePairs = new Map<string, { leagueId: string; date: string }>()
    fixtures.forEach((f) => {
      if (!f.league_id || !f.match_date) return
      leagueDatePairs.set(`${f.league_id}|${f.match_date}`, {
        leagueId: f.league_id,
        date: f.match_date,
      })
    })

    let leaguesFailed = 0
    const oddsResults = await mapWithConcurrency(
      Array.from(leagueDatePairs.values()),
      6,
      async ({ leagueId, date: leagueDate }) => {
        try {
          return await getOddsByLeague(leagueId, leagueDate)
        } catch (oddsError) {
          leaguesFailed++
          console.error(`Error fetching odds for league ${leagueId}:`, oddsError)
          return [] as Odds[]
        }
      }
    )

    const oddsByMatchId = new Map<string, Odds>()
    oddsResults.flat().forEach((odds) => {
      if (odds.match_id) oddsByMatchId.set(odds.match_id, odds)
    })

    const isCorrectScore = planType === 'correct_score'

    const generated = buildPredictions(fixtures, oddsByMatchId, {
      predictionDate: date,
      minConfidence: confidenceThreshold,
      minOdds: minOddsValue ?? undefined,
      maxOdds: maxOddsValue ?? undefined,
      markets: Array.isArray(markets) && markets.length > 0 ? markets : undefined,
      correctScoreOnly: isCorrectScore,
      perFixture: Math.max(1, Math.min(5, Number(perFixture) || 1)),
      limit: limit !== undefined ? Math.max(1, Number(limit)) : undefined,
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
        fixturesPriced: oddsByMatchId.size,
        leaguesFailed,
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
      return cleaned
    })

    if (cleanedPredictions.length === 0) {
      return NextResponse.json({
        message: 'No predictions matched the selected filters',
        synced: 0,
        fixturesConsidered: fixtures.length,
        fixturesPriced: oddsByMatchId.size,
        leaguesFailed,
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
      fixturesPriced: oddsByMatchId.size,
      leaguesFailed,
      minConfidence: confidenceThreshold,
      minOdds: minOddsValue,
      maxOdds: maxOddsValue,
    })
  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
