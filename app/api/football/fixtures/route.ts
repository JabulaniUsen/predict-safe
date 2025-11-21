import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const leagueId = searchParams.get('league_id')

    const queryParams = new URLSearchParams({
      action: 'get_events',
      APIkey: API_KEY,
    })

    // Both from and to are required by the API
    if (from && to) {
      queryParams.append('from', from)
      queryParams.append('to', to)
    } else if (from) {
      // If only from is provided, use it for both
      queryParams.append('from', from)
      queryParams.append('to', from)
    } else {
      // If neither is provided, use today
      const today = new Date().toISOString().split('T')[0]
      queryParams.append('from', today)
      queryParams.append('to', today)
    }

    if (leagueId) {
      queryParams.append('league_id', leagueId)
    }

    const url = `${BASE_URL}/?${queryParams.toString()}`
    console.log('API Football Fixtures URL:', url)

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('API Football Fixtures Response:', JSON.stringify(data).substring(0, 500))
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

