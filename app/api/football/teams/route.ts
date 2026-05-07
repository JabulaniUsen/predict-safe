import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '2039aa84e45a691207351f44eb5f8a8fc7eb516a77bdbf789cebf2a98aa4ca4a'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const leagueId = searchParams.get('league_id')

    // Free plan leagues: Championship (153), Ligue 2 (164)
    const popularLeagueIds = leagueId
      ? [leagueId]
      : ['153', '164']

    let allTeams: any[] = []

    // Fetch teams from popular leagues
    for (const lid of popularLeagueIds.slice(0, 3)) { // Limit to 3 leagues to avoid too many requests
      try {
        const queryParams = new URLSearchParams({
          action: 'get_teams',
          APIkey: API_KEY,
          league_id: lid,
        })

        const url = `${BASE_URL}/?${queryParams.toString()}`
        const response = await fetch(url, {
          next: { revalidate: 3600 }, // Cache for 1 hour
        })

        if (!response.ok) continue

        let data = await response.json()
        
        // Handle different response formats
        if (!Array.isArray(data)) {
          if (data.error) continue
          if (data.teams && Array.isArray(data.teams)) {
            data = data.teams
          } else {
            continue
          }
        }

        // Add teams to our collection, avoiding duplicates
        if (Array.isArray(data)) {
          const uniqueTeams = data.filter((team: any) => 
            !allTeams.find((t: any) => t.team_id === team.team_id)
          )
          allTeams.push(...uniqueTeams)
        }
      } catch (err) {
        // Continue with next league if one fails
        console.error(`Error fetching teams for league ${lid}:`, err)
        continue
      }
    }

    // Filter teams by search query if provided
    let teams = allTeams
    if (search) {
      const searchLower = search.toLowerCase()
      teams = allTeams.filter((team: any) => 
        team.team_name?.toLowerCase().includes(searchLower) ||
        team.team_key?.toLowerCase().includes(searchLower)
      )
    }

    // Sort by name and limit results
    teams = teams
      .sort((a: any, b: any) => a.team_name?.localeCompare(b.team_name))
      .slice(0, 100)

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

