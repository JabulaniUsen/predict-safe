import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const leagueId = searchParams.get('league_id')

    // Popular league IDs: Premier League (152), La Liga (302), Serie A (207), Bundesliga (175), Ligue 1 (168)
    // Champions League (3), Europa League (4), World Cup (5)
    const popularLeagueIds = leagueId 
      ? [leagueId]
      : ['152', '302', '207', '175', '168', '3', '4']

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

    return NextResponse.json(teams)
  } catch (error: any) {
    console.error('API Football Teams Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

