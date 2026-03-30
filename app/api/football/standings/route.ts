import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const leagueId = searchParams.get('league_id')

    if (!leagueId) {
      return NextResponse.json({ error: 'league_id is required' }, { status: 400 })
    }

    const queryParams = new URLSearchParams({
      action: 'get_standings',
      APIkey: API_KEY,
      league_id: leagueId,
    })

    const url = `${BASE_URL}/?${queryParams.toString()}`

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Log the response structure for debugging (remove in production)
    console.log('API Football Standings Response:', JSON.stringify(data).substring(0, 200))
    
    // API Football might return an object with standings array, or the array directly
    // Handle both cases
    const cacheHeaders = {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
    }

    if (Array.isArray(data)) {
      return NextResponse.json(data, cacheHeaders)
    } else if (data && Array.isArray(data.standings)) {
      return NextResponse.json(data.standings, cacheHeaders)
    } else if (data && typeof data === 'object') {
      const standingsArray = Object.values(data).find((val: any) => Array.isArray(val))
      if (standingsArray) {
        return NextResponse.json(standingsArray, cacheHeaders)
      }
      if (data.error || data.message) {
        console.error('API Football Error:', data.error || data.message)
        return NextResponse.json([])
      }
    }

    return NextResponse.json([])
  } catch (error: any) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

