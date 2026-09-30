import { NextRequest, NextResponse } from 'next/server'
import { getStandings, isRateLimitError } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const leagueId = searchParams.get('league_id')

    if (!leagueId) {
      return NextResponse.json({ error: 'league_id is required' }, { status: 400 })
    }

    const standings = await getStandings(leagueId)

    return NextResponse.json(standings, {
      // Standings only change when full-time results are processed (a few
      // times a day), so this is cached for an hour at the edge. Long edge
      // caching is the main defence against the provider's per-minute limit:
      // repeat visitors share one cached response instead of each triggering
      // a provider call.
      headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (error: unknown) {
    console.error('API Football Error:', error)
    // Throttling is transient: answer 429 (not 500) so clients can tell
    // "try again shortly" apart from a real failure.
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { error: 'Standings are updating. Please try again shortly.', rateLimited: true },
        { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } }
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to load standings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
