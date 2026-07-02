import { NextRequest, NextResponse } from 'next/server'
import { getLeagues } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const country = searchParams.get('country') || undefined

    const leagues = await getLeagues(country)

    return NextResponse.json(leagues, {
      headers: {
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=172800',
      },
    })
  } catch (error: any) {
    console.error('API Football Leagues Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
