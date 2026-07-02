import { NextRequest, NextResponse } from 'next/server'
import { getTeams, FREE_PLAN_LEAGUES } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || undefined
    const leagueId = searchParams.get('league_id')

    const leagueIds = leagueId ? [leagueId] : FREE_PLAN_LEAGUES

    const allTeams: Awaited<ReturnType<typeof getTeams>> = []
    for (const lid of leagueIds.slice(0, 3)) {
      try {
        const teams = await getTeams(lid, search)
        const uniqueTeams = teams.filter(
          (team) => !allTeams.find((t) => t.team_id === team.team_id)
        )
        allTeams.push(...uniqueTeams)
      } catch (err) {
        console.error(`Error fetching teams for league ${lid}:`, err)
        continue
      }
    }

    const teams = allTeams.sort((a, b) => a.team_name.localeCompare(b.team_name)).slice(0, 100)

    return NextResponse.json(teams, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error: any) {
    console.error('API Football Teams Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
