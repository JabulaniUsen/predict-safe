import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.API_FOOTBALL_KEY || '2039aa84e45a691207351f44eb5f8a8fc7eb516a77bdbf789cebf2a98aa4ca4a'
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://apiv3.apifootball.com'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const firstTeamId = searchParams.get('firstTeamId')
    const secondTeamId = searchParams.get('secondTeamId')

    if (!firstTeamId || !secondTeamId) {
      return NextResponse.json({ error: 'firstTeamId and secondTeamId are required' }, { status: 400 })
    }

    const queryParams = new URLSearchParams({
      action: 'get_H2H',
      APIkey: API_KEY,
      firstTeamId,
      secondTeamId,
    })

    const url = `${BASE_URL}/?${queryParams.toString()}`

    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error: any) {
    console.error('API Football H2H Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

