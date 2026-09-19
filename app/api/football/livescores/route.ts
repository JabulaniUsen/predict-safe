import { NextRequest, NextResponse } from 'next/server'
import { getLiveFixtures, getFixtures, FREE_PLAN_LEAGUES } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

/**
 * Matches for the live scores page.
 *
 * `scope=live` returns only what's in play, straight from the provider's live
 * endpoint. Anything else returns today's fixtures for the leagues we cover,
 * rather than every fixture on earth for the date - the page previously pulled
 * the whole worldwide slate on each load and filtered it client-side.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const scope = searchParams.get('scope') || 'live'
    const leagueId = searchParams.get('league_id') || undefined
    const date = searchParams.get('date') || undefined

    if (scope === 'live') {
      const fixtures = await getLiveFixtures(leagueId)
      return NextResponse.json(fixtures, {
        headers: {
          // Live scores move constantly, so this is deliberately brief - just
          // enough to absorb the auto-refresh from many visitors at once.
          'Cache-Control': 'public, max-age=15, s-maxage=20, stale-while-revalidate=60',
        },
      })
    }

    if (!date) {
      return NextResponse.json({ error: 'A date is required for this scope' }, { status: 400 })
    }

    const leagues = leagueId ? [leagueId] : FREE_PLAN_LEAGUES
    const results = await Promise.all(
      leagues.map((id) => getFixtures(date, id, date).catch(() => []))
    )

    const fixtures = results.flat().sort((a, b) => {
      if (a.match_live !== b.match_live) return a.match_live === '1' ? -1 : 1
      return `${a.match_date} ${a.match_time}`.localeCompare(`${b.match_date} ${b.match_time}`)
    })

    return NextResponse.json(fixtures, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: unknown) {
    console.error('Live scores error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
