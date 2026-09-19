import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getFixtures, type Fixture } from '@/lib/api-football'
import {
  generateFreePicks,
  findFreePickFilter,
  applyLiveFixtureState,
} from '@/lib/predictions/free-picks'
import type { GeneratedPrediction } from '@/lib/predictions/generate'

export const dynamic = 'force-dynamic'

/**
 * Free / Safe picks for a date and filter.
 *
 * The picks for a given (date, filter) are built **once** and then stored, so
 * every visitor is served the identical set. Before this, each browser built
 * its own from the odds provider on page load, which is why the same date
 * showed three predictions on one device, one on another and none on a third,
 * and why a refresh could change the answer.
 *
 * Only the live parts - status and scoreline - are refreshed per request. The
 * selections themselves are fixed once written.
 */

/** Rebuild a partial set no more often than this while the day is still live. */
const PARTIAL_RETRY_MS = 10 * 60 * 1000

function isComplete(row: { leagues_total: number; leagues_succeeded: number }): boolean {
  return row.leagues_total > 0 && row.leagues_succeeded >= row.leagues_total
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date') || ''
    const filterId = searchParams.get('filter') || 'free'

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A date (YYYY-MM-DD) is required' }, { status: 400 })
    }

    const filter = findFreePickFilter(filterId)
    const readClient = await createClient()

    const { data: existing } = await readClient
      .from('generated_free_picks')
      .select('*')
      .eq('prediction_date', date)
      .eq('filter_id', filter.id)
      .maybeSingle()

    const stored = existing as {
      picks: GeneratedPrediction[]
      leagues_total: number
      leagues_succeeded: number
      generated_at: string
    } | null

    let picks: GeneratedPrediction[] | null = null
    let source: 'stored' | 'generated' = 'stored'

    if (stored) {
      const staleEnoughToRetry =
        !isComplete(stored) &&
        Date.now() - new Date(stored.generated_at).getTime() > PARTIAL_RETRY_MS

      if (!staleEnoughToRetry) {
        picks = Array.isArray(stored.picks) ? stored.picks : []
      }
    }

    if (picks === null) {
      // Either nothing stored yet, or what is stored was built while leagues
      // were failing and is old enough to be worth another attempt.
      const result = await generateFreePicks(date, filter.id)
      source = 'generated'
      picks = result.picks

      // Don't overwrite a good stored set with a worse one - a rebuild that
      // reached fewer leagues than the stored attempt is a step backwards.
      const worseThanStored =
        stored && result.leaguesSucceeded < stored.leagues_succeeded

      if (worseThanStored) {
        picks = Array.isArray(stored!.picks) ? stored!.picks : []
        source = 'stored'
      } else if (result.picks.length > 0) {
        await persist(date, filter.id, result)
      }
    }

    // Refresh scores/status so a stored set doesn't show yesterday's state.
    let fixtures: Fixture[] = []
    try {
      fixtures = await getFixtures(date, undefined, date)
    } catch (error) {
      console.error(`[free-picks] could not refresh fixture state for ${date}:`, error)
    }

    const withLiveState = applyLiveFixtureState(picks, fixtures)

    return NextResponse.json(
      {
        date,
        filter: filter.id,
        picks: withLiveState,
        source,
      },
      {
        headers: {
          // Safe to cache at the edge: the selections come from a stored row,
          // so every edge converges on the same content. Kept short because
          // scores move.
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error: unknown) {
    console.error('[free-picks] request failed:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function persist(
  date: string,
  filterId: string,
  result: { picks: GeneratedPrediction[]; leaguesTotal: number; leaguesSucceeded: number }
) {
  const serviceClient = createServiceClient()

  if (!serviceClient) {
    // Without the service role key the picks can't be stored, so they'd be
    // rebuilt per request. Generation is deterministic, so visitors still get
    // matching results as long as the provider is healthy - but the guarantee
    // is weaker, hence the warning.
    console.warn(
      '[free-picks] SUPABASE_SERVICE_ROLE_KEY is not set - picks cannot be cached and will ' +
        'be regenerated on every request. Set it so every visitor is served the same stored set.'
    )
    return
  }

  const row = {
    prediction_date: date,
    filter_id: filterId,
    picks: result.picks,
    leagues_total: result.leaguesTotal,
    leagues_succeeded: result.leaguesSucceeded,
    generated_at: new Date().toISOString(),
  }

  // The generated Database types don't line up with the client's upsert
  // generics, so the row is widened here - the same approach the rest of the
  // app uses for Supabase writes.
  const { error } = await serviceClient
    .from('generated_free_picks')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(row as any, { onConflict: 'prediction_date,filter_id' })

  if (error) {
    console.error('[free-picks] failed to store generated picks:', error)
  }
}
