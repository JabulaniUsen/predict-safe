import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '2039aa84e45a691207351f44eb5f8a8fc7eb516a77bdbf789cebf2a98aa4ca4a'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

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
    if (data && typeof data === 'object' && 'error' in data) {
      const apiMessage = typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : 'API Football provider error'
      return NextResponse.json({ error: apiMessage }, { status: 502 })
    }
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error: unknown) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
