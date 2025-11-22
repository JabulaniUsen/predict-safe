import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get('country') // Optional: filter by country

    // Fetch leagues from API-Football
    const queryParams = new URLSearchParams({
      action: 'get_leagues',
      APIkey: API_KEY,
    })

    if (country) {
      queryParams.append('country', country)
    }

    const url = `${BASE_URL}/?${queryParams.toString()}`

    const response = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours since leagues don't change often
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    let data = await response.json()
    
    // Handle different response formats
    if (!Array.isArray(data)) {
      if (data.error) {
        console.error('API Football Error:', data.error)
        return NextResponse.json({ error: data.error }, { status: 400 })
      }
      if (data.leagues && Array.isArray(data.leagues)) {
        data = data.leagues
      } else {
        data = []
      }
    }

    // Filter active leagues and sort by country then name
    const leagues = data
      .filter((league: any) => league.league_id && league.league_name)
      .sort((a: any, b: any) => {
        // Sort by country first, then league name
        if (a.country_name && b.country_name) {
          const countryCompare = a.country_name.localeCompare(b.country_name)
          if (countryCompare !== 0) return countryCompare
        }
        return a.league_name.localeCompare(b.league_name)
      })

    return NextResponse.json(leagues)
  } catch (error: any) {
    console.error('API Football Leagues Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

