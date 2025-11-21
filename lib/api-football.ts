const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export interface Fixture {
  match_id: string
  country_id: string
  country_name: string
  league_id: string
  league_name: string
  match_date: string
  match_status: string
  match_time: string
  match_hometeam_id: string
  match_hometeam_name: string
  match_hometeam_score: string
  match_awayteam_name: string
  match_awayteam_id: string
  match_awayteam_score: string
  match_hometeam_halftime_score: string
  match_awayteam_halftime_score: string
  match_hometeam_extra_score?: string
  match_awayteam_extra_score?: string
  match_hometeam_penalty_score?: string
  match_awayteam_penalty_score?: string
  match_hometeam_system?: string
  match_awayteam_system?: string
  match_live: string
  match_round?: string
  match_stadium?: string
  match_referee?: string
  team_home_badge?: string
  team_away_badge?: string
  league_logo?: string
  country_logo?: string
  league_year?: string
}

export interface Odds {
  match_id: string
  bookmaker: string
  bets: Array<{
    label_id: number
    label_name: string
    values: Array<{
      value: string
      odd: string
    }>
  }>
}

export interface Standing {
  country_name: string
  league_id: string
  league_name: string
  team_id: string
  team_name: string
  overall_league_position: string
  overall_league_payed: string
  overall_league_W: string
  overall_league_D: string
  overall_league_L: string
  overall_league_GF: string
  overall_league_GA: string
  overall_league_PTS: string
  home_league_position: string
  home_league_payed: string
  home_league_W: string
  home_league_D: string
  home_league_L: string
  home_league_GF: string
  home_league_GA: string
  home_league_PTS: string
  away_league_position: string
  away_league_payed: string
  away_league_W: string
  away_league_D: string
  away_league_L: string
  away_league_GF: string
  away_league_GA: string
  away_league_PTS: string
  team_badge: string
  overall_promotion?: string
  home_promotion?: string
  away_promotion?: string
  league_round?: string
  fk_stage_key?: string
  stage_name?: string
}

// Server-side function (for use in Server Components)
async function fetchAPIServer(endpoint: string, params: Record<string, string> = {}) {
  const queryParams = new URLSearchParams({
    action: endpoint,
    APIkey: API_KEY,
    ...params,
  })

  const url = `${BASE_URL}/?${queryParams.toString()}`
  
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Football Error:', error)
    throw error
  }
}

// Client-side function (for use in Client Components - uses API routes to avoid CORS)
async function fetchAPIClient(endpoint: string, params: Record<string, string> = {}) {
  try {
    let url = ''
    
    if (endpoint === 'get_standings') {
      url = `/api/football/standings?league_id=${params.league_id}`
    } else if (endpoint === 'get_events') {
      // Ensure from and to are both present
      if (params.from && !params.to) {
        params.to = params.from
      }
      url = `/api/football/fixtures?${new URLSearchParams(params).toString()}`
    } else if (endpoint === 'get_odds') {
      url = `/api/football/odds?match_id=${params.match_id}`
    } else if (endpoint === 'get_H2H') {
      url = `/api/football/h2h?firstTeamId=${params.firstTeamId}&secondTeamId=${params.secondTeamId}`
    } else {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }

    const response = await fetch(url)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || `API Error: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Football Error:', error)
    throw error
  }
}

// Detect if we're on server or client
function isServer() {
  return typeof window === 'undefined'
}

async function fetchAPI(endpoint: string, params: Record<string, string> = {}) {
  if (isServer()) {
    return fetchAPIServer(endpoint, params)
  } else {
    return fetchAPIClient(endpoint, params)
  }
}

export async function getFixtures(date?: string, leagueId?: string, toDate?: string) {
  const params: Record<string, string> = {}
  
  if (date) {
    params.from = date
    params.to = toDate || date // Use toDate if provided, otherwise use same date
  }
  
  if (leagueId) {
    params.league_id = leagueId
  }

  const data = await fetchAPI('get_events', params)
  return data as Fixture[]
}

export async function getOdds(fixtureId: string) {
  const data = await fetchAPI('get_odds', { match_id: fixtureId })
  return data as Odds[]
}

export interface H2HData {
  firstTeam_VS_secondTeam: any[]
  firstTeam_lastResults: any[]
  secondTeam_lastResults: any[]
}

export async function getH2H(firstTeamId: string, secondTeamId: string) {
  const data = await fetchAPI('get_H2H', { 
    firstTeamId, 
    secondTeamId 
  })
  return data as H2HData
}

export async function getStandings(leagueId: string) {
  const data = await fetchAPI('get_standings', { league_id: leagueId })
  
  // Ensure we always return an array
  if (Array.isArray(data)) {
    return data as Standing[]
  } else if (data && typeof data === 'object') {
    // Try to extract array from response object
    const arrayData = Object.values(data).find((val: any) => Array.isArray(val))
    return Array.isArray(arrayData) ? (arrayData as Standing[]) : []
  }
  
  return [] as Standing[]
}

// Top 5 leagues IDs
export const TOP_LEAGUES = {
  PREMIER_LEAGUE: '152', // England Premier League
  LA_LIGA: '302', // Spain La Liga
  SERIE_A: '207', // Italy Serie A
  BUNDESLIGA: '175', // Germany Bundesliga
  LIGUE_1: '168', // France Ligue 1
}

export function getLeagueName(leagueId: string): string {
  const names: Record<string, string> = {
    '152': 'Premier League',
    '302': 'La Liga',
    '207': 'Serie A',
    '175': 'Bundesliga',
    '168': 'Ligue 1',
  }
  return names[leagueId] || 'Unknown League'
}

