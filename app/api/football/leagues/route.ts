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
        // See football/fixtures/route.ts for why CDN caching is safe here
        // alongside force-dynamic. League reference data barely changes,
        // so this can be cached for a long time.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error: any) {
    console.error('API Football Leagues Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
