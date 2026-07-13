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
        // Caching is handled by the shared provider-response cache in lib/api-football.ts;
        // avoid CDN-level caching here since it previously cached by path, ignoring query params.
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: any) {
    console.error('API Football Leagues Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
