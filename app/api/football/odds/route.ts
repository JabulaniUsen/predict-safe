import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '1cb32db603edc3ff2e0c13ba21224f6d55a88a1be0bc9536ac15f4c12011e9ac'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const matchId = searchParams.get('match_id')

    if (!matchId) {
      return NextResponse.json({ error: 'match_id is required' }, { status: 400 })
    }

    const queryParams = new URLSearchParams({
      action: 'get_odds',
      APIkey: API_KEY,
      match_id: matchId,
    })

    const url = `${BASE_URL}/?${queryParams.toString()}`

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('API Football Odds Response:', JSON.stringify(data).substring(0, 500))
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

