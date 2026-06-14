import { NextRequest, NextResponse } from 'next/server'
import { getH2H } from '@/lib/api-football'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const firstTeamId = searchParams.get('firstTeamId')
    const secondTeamId = searchParams.get('secondTeamId')

    if (!firstTeamId || !secondTeamId) {
      return NextResponse.json({ error: 'firstTeamId and secondTeamId are required' }, { status: 400 })
    }

    const data = await getH2H(firstTeamId, secondTeamId)

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
