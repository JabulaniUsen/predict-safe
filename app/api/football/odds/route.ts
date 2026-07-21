import { NextRequest, NextResponse } from 'next/server'
import { getOdds, getOddsByLeague } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matchId = searchParams.get('match_id')
    const leagueId = searchParams.get('league_id')
    const date = searchParams.get('date')

    if (!matchId && !(leagueId && date)) {
      return NextResponse.json({ error: 'match_id, or league_id and date, is required' }, { status: 400 })
    }

    const odds = matchId ? await getOdds(matchId) : await getOddsByLeague(leagueId as string, date as string)

    return NextResponse.json(odds, {
      headers: {
        // See fixtures/route.ts for why CDN caching is safe here alongside
        // force-dynamic. Kept short since odds can move before kickoff.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: unknown) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
