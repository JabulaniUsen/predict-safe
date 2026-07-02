import { NextRequest, NextResponse } from 'next/server'
import { getStandings } from '@/lib/api-football'

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
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error: any) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
