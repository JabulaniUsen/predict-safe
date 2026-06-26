const API_KEY = process.env.API_FOOTBALL_KEY
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io'

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
  odd_bookmakers?: string
  odd_date?: string
  odd_1?: string
  odd_x?: string
  odd_2?: string
  odd_1x?: string
  odd_12?: string
  odd_x2?: string
  'o+0.5'?: string
  'u+0.5'?: string
  'o+1'?: string
  'u+1'?: string
  'o+1.5'?: string
  'u+1.5'?: string
  'o+2'?: string
  'u+2'?: string
  'o+2.5'?: string
  'u+2.5'?: string
  'o+3'?: string
  'u+3'?: string
  'o+3.5'?: string
  'u+3.5'?: string
  'o+4'?: string
  'u+4'?: string
  'o+4.5'?: string
  'u+4.5'?: string
  'o+5'?: string
  'u+5'?: string
  'o+5.5'?: string
  'u+5.5'?: string
  bts_yes?: string
  bts_no?: string
  [key: string]: any // Allow additional dynamic properties like ah-* odds
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

export interface H2HData {
  firstTeam_VS_secondTeam: Fixture[]
  firstTeam_lastResults: Fixture[]
  secondTeam_lastResults: Fixture[]
}

export interface League {
  league_id: string
  league_name: string
  country_name?: string
  country_logo?: string
  league_logo?: string
  league_type?: string
  current_season?: string
}

export interface Team {
  team_id: string
  team_name: string
  team_badge?: string
}

// European leagues run Aug-May, so the "season" year is the year the season started
function getSeasonYear(dateStr?: string): number {
  const date = dateStr ? new Date(dateStr) : new Date()
  const month = date.getUTCMonth() + 1 // 1-indexed
  const year = date.getUTCFullYear()
  return month >= 7 ? year : year - 1
}

// Map API-Sports fixture.status.short -> apifootball-style status/live flags
function mapFixtureStatus(short: string): { match_status: string; match_live: string } {
  const liveCodes = ['1H', 'HT', '2H', 'ET', 'BT', 'P']
  const finishedCodes = ['FT', 'AET', 'PEN']
  const match_live = liveCodes.includes(short) ? '1' : '0'

  let match_status = short
  if (short === 'NS') match_status = 'Not Started'
  else if (finishedCodes.includes(short)) match_status = 'Finished'

  return { match_status, match_live }
}

function mapFixture(item: any): Fixture {
  const fixture = item.fixture || {}
  const league = item.league || {}
  const teams = item.teams || {}
  const goals = item.goals || {}
  const score = item.score || {}
  const { match_status, match_live } = mapFixtureStatus(fixture.status?.short || '')

  const dateObj = fixture.date ? new Date(fixture.date) : null
  const match_date = dateObj ? dateObj.toISOString().split('T')[0] : ''
  const match_time = dateObj ? dateObj.toISOString().split('T')[1].slice(0, 5) : ''

  return {
    match_id: String(fixture.id ?? ''),
    country_id: '',
    country_name: league.country || '',
    league_id: String(league.id ?? ''),
    league_name: league.name || '',
    match_date,
    match_status,
    match_time,
    match_hometeam_id: String(teams.home?.id ?? ''),
    match_hometeam_name: teams.home?.name || '',
    match_hometeam_score: goals.home != null ? String(goals.home) : '',
    match_awayteam_name: teams.away?.name || '',
    match_awayteam_id: String(teams.away?.id ?? ''),
    match_awayteam_score: goals.away != null ? String(goals.away) : '',
    match_hometeam_halftime_score: score.halftime?.home != null ? String(score.halftime.home) : '',
    match_awayteam_halftime_score: score.halftime?.away != null ? String(score.halftime.away) : '',
    match_hometeam_extra_score: score.extratime?.home != null ? String(score.extratime.home) : '',
    match_awayteam_extra_score: score.extratime?.away != null ? String(score.extratime.away) : '',
    match_hometeam_penalty_score: score.penalty?.home != null ? String(score.penalty.home) : '',
    match_awayteam_penalty_score: score.penalty?.away != null ? String(score.penalty.away) : '',
    match_live,
    match_round: league.round || '',
    match_stadium: fixture.venue?.name || '',
    match_referee: fixture.referee || '',
    team_home_badge: teams.home?.logo || '',
    team_away_badge: teams.away?.logo || '',
    league_logo: league.logo || '',
    country_logo: league.flag || '',
    league_year: league.season != null ? String(league.season) : '',
  }
}

// Find a bet's values by name within a bookmaker's bets array
function findBet(bets: any[], name: string): any[] | null {
  const bet = bets?.find((b: any) => b.name === name)
  return bet ? bet.values : null
}

function findValue(values: any[] | null, value: string): string | undefined {
  const found = values?.find((v: any) => v.value === value)
  return found?.odd
}

function mapOdds(fixtureId: string, response: any[]): Odds {
  const odds: Odds = { match_id: fixtureId }

  if (!Array.isArray(response) || response.length === 0) {
    return odds
  }

  const bookmakers = response[0]?.bookmakers || []
  const bookmaker = bookmakers.find((b: any) => b.id === 8) || bookmakers[0]
  if (!bookmaker) {
    return odds
  }

  odds.odd_bookmakers = bookmaker.name
  odds.odd_date = response[0]?.update

  const matchWinner = findBet(bookmaker.bets, 'Match Winner')
  odds.odd_1 = findValue(matchWinner, 'Home')
  odds.odd_x = findValue(matchWinner, 'Draw')
  odds.odd_2 = findValue(matchWinner, 'Away')

  const doubleChance = findBet(bookmaker.bets, 'Double Chance')
  odds.odd_1x = findValue(doubleChance, 'Home/Draw')
  odds.odd_12 = findValue(doubleChance, 'Home/Away')
  odds.odd_x2 = findValue(doubleChance, 'Draw/Away')

  const goalsOverUnder = findBet(bookmaker.bets, 'Goals Over/Under')
  if (goalsOverUnder) {
    for (const line of ['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5']) {
      const over = findValue(goalsOverUnder, `Over ${line}`)
      const under = findValue(goalsOverUnder, `Under ${line}`)
      if (over) odds[`o+${line}`] = over
      if (under) odds[`u+${line}`] = under
    }
  }

  const btts = findBet(bookmaker.bets, 'Both Teams Score')
  odds.bts_yes = findValue(btts, 'Yes')
  odds.bts_no = findValue(btts, 'No')

  return odds
}

function mapStanding(row: any, league: any): Standing {
  const team = row.team || {}
  const all = row.all || {}
  const home = row.home || {}
  const away = row.away || {}

  return {
    country_name: league.country || '',
    league_id: String(league.id ?? ''),
    league_name: league.name || '',
    team_id: String(team.id ?? ''),
    team_name: team.name || '',
    overall_league_position: String(row.rank ?? ''),
    overall_league_payed: String(all.played ?? ''),
    overall_league_W: String(all.win ?? ''),
    overall_league_D: String(all.draw ?? ''),
    overall_league_L: String(all.lose ?? ''),
    overall_league_GF: String(all.goals?.for ?? ''),
    overall_league_GA: String(all.goals?.against ?? ''),
    overall_league_PTS: String(row.points ?? ''),
    home_league_position: String(row.rank ?? ''),
    home_league_payed: String(home.played ?? ''),
    home_league_W: String(home.win ?? ''),
    home_league_D: String(home.draw ?? ''),
    home_league_L: String(home.lose ?? ''),
    home_league_GF: String(home.goals?.for ?? ''),
    home_league_GA: String(home.goals?.against ?? ''),
    home_league_PTS: '',
    away_league_position: String(row.rank ?? ''),
    away_league_payed: String(away.played ?? ''),
    away_league_W: String(away.win ?? ''),
    away_league_D: String(away.draw ?? ''),
    away_league_L: String(away.lose ?? ''),
    away_league_GF: String(away.goals?.for ?? ''),
    away_league_GA: String(away.goals?.against ?? ''),
    away_league_PTS: '',
    team_badge: team.logo || '',
    overall_promotion: row.description || '',
    league_round: row.group || '',
    stage_name: row.status || '',
  }
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = []
  const start = new Date(from)
  const end = new Date(to)
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().split('T')[0])
  }
  return dates.length > 0 ? dates : [from]
}

// Server-side request to API-Sports
async function callProvider(path: string, params: Record<string, string> = {}) {
  if (!API_KEY) {
    throw new Error('Missing required environment variable: API_FOOTBALL_KEY')
  }

  const queryParams = new URLSearchParams(params)
  const url = `${BASE_URL}/${path}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  try {
    const response = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY },
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

// Detect if we're on server or client
function isServer() {
  return typeof window === 'undefined'
}

// Client-side fetch via our own API routes (keeps the key server-only)
async function callClient(routePath: string, params: Record<string, string> = {}) {
  const queryParams = new URLSearchParams(params)
  const url = `${routePath}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `API Error: ${response.statusText}`)
  }
  return response.json()
}

export async function getFixtures(date?: string, leagueId?: string, toDate?: string) {
  if (!isServer()) {
    const params: Record<string, string> = {}
    if (date) {
      params.from = date
      params.to = toDate || date
    }
    if (leagueId) params.league_id = leagueId
    return callClient('/api/football/fixtures', params) as Promise<Fixture[]>
  }

  if (!date) return [] as Fixture[]
  const to = toDate || date

  if (leagueId) {
    const data = await callProvider('fixtures', {
      league: leagueId,
      season: String(getSeasonYear(date)),
      from: date,
      to,
    })
    return (data.response || []).map(mapFixture) as Fixture[]
  }

  // No league filter: fetch each day individually and merge
  const fixtures: Fixture[] = []
  for (const day of dateRange(date, to)) {
    const data = await callProvider('fixtures', { date: day })
    fixtures.push(...(data.response || []).map(mapFixture))
  }
  return fixtures
}

export async function getOdds(fixtureId: string) {
  if (!isServer()) {
    return callClient('/api/football/odds', { match_id: fixtureId }) as Promise<Odds[]>
  }

  let data = await callProvider('odds', { fixture: fixtureId, bookmaker: '8' })
  if (!data.response || data.response.length === 0) {
    data = await callProvider('odds', { fixture: fixtureId })
  }

  if (!data.response || data.response.length === 0) {
    return [] as Odds[]
  }

  return [mapOdds(fixtureId, data.response)] as Odds[]
}

export async function getH2H(firstTeamId: string, secondTeamId: string) {
  if (!isServer()) {
    return callClient('/api/football/h2h', { firstTeamId, secondTeamId }) as Promise<H2HData>
  }

  const [h2h, firstTeamFixtures, secondTeamFixtures] = await Promise.all([
    callProvider('fixtures/headtohead', { h2h: `${firstTeamId}-${secondTeamId}`, last: '10' }),
    callProvider('fixtures', { team: firstTeamId, last: '5', status: 'FT-AET-PEN' }),
    callProvider('fixtures', { team: secondTeamId, last: '5', status: 'FT-AET-PEN' }),
  ])

  return {
    firstTeam_VS_secondTeam: (h2h.response || []).map(mapFixture),
    firstTeam_lastResults: (firstTeamFixtures.response || []).map(mapFixture),
    secondTeam_lastResults: (secondTeamFixtures.response || []).map(mapFixture),
  } as H2HData
}

export async function getStandings(leagueId: string) {
  if (!isServer()) {
    return callClient('/api/football/standings', { league_id: leagueId }) as Promise<Standing[]>
  }

  const data = await callProvider('standings', {
    league: leagueId,
    season: String(getSeasonYear()),
  })

  const leagueData = data.response?.[0]?.league
  if (!leagueData?.standings) {
    return [] as Standing[]
  }

  const standings: Standing[] = []
  for (const group of leagueData.standings) {
    for (const row of group) {
      standings.push(mapStanding(row, leagueData))
    }
  }
  return standings
}

export async function getLeagues(search?: string) {
  if (!isServer()) {
    return callClient('/api/football/leagues', search ? { country: search } : {}) as Promise<League[]>
  }

  const params: Record<string, string> = { current: 'true' }
  if (search) params.search = search

  const data = await callProvider('leagues', params)
  const leagues: League[] = (data.response || []).map((item: any) => {
    const seasons = item.seasons || []
    const currentSeason = seasons.find((s: any) => s.current) || seasons[seasons.length - 1]
    return {
      league_id: String(item.league?.id ?? ''),
      league_name: item.league?.name || '',
      country_name: item.country?.name || '',
      country_logo: item.country?.flag || '',
      league_logo: item.league?.logo || '',
      league_type: item.league?.type || '',
      current_season: currentSeason?.year != null ? String(currentSeason.year) : '',
    }
  })

  return leagues
    .filter((l) => l.league_id && l.league_name)
    .sort((a, b) => {
      if (a.country_name && b.country_name) {
        const countryCompare = a.country_name.localeCompare(b.country_name)
        if (countryCompare !== 0) return countryCompare
      }
      return a.league_name.localeCompare(b.league_name)
    })
}

export async function getTeams(leagueId: string, search?: string) {
  if (!isServer()) {
    const params: Record<string, string> = { league_id: leagueId }
    if (search) params.search = search
    return callClient('/api/football/teams', params) as Promise<Team[]>
  }

  const data = await callProvider('teams', {
    league: leagueId,
    season: String(getSeasonYear()),
  })

  let teams: Team[] = (data.response || []).map((item: any) => ({
    team_id: String(item.team?.id ?? ''),
    team_name: item.team?.name || '',
    team_badge: item.team?.logo || '',
  }))

  if (search) {
    const searchLower = search.toLowerCase()
    teams = teams.filter((team) => team.team_name.toLowerCase().includes(searchLower))
  }

  return teams.sort((a, b) => a.team_name.localeCompare(b.team_name)).slice(0, 100)
}

export const TOP_LEAGUES = {
  PREMIER_LEAGUE: '39',  // England Premier League
  LA_LIGA: '140',        // Spain La Liga
  SERIE_A: '135',        // Italy Serie A
  BUNDESLIGA: '78',      // Germany Bundesliga
  LIGUE_1: '61',         // France Ligue 1
  CHAMPIONSHIP: '40',    // England Championship
  LIGUE_2: '62',         // France Ligue 2
}

// Leagues used to source fixtures for the free predictions section.
// Was previously restricted to 2 leagues due to the old provider's free-tier
// limits; the current API-Sports plan has full access, so use all top leagues.
export const FREE_PLAN_LEAGUES = Object.values(TOP_LEAGUES)

export function getLeagueName(leagueId: string): string {
  const names: Record<string, string> = {
    '39': 'Premier League',
    '140': 'La Liga',
    '135': 'Serie A',
    '78': 'Bundesliga',
    '61': 'Ligue 1',
    '40': 'Championship',
    '62': 'Ligue 2',
  }
  return names[leagueId] || 'Unknown League'
}
