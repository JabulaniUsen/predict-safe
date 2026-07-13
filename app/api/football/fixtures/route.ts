import { NextRequest, NextResponse } from 'next/server'
import { getFixtures } from '@/lib/api-football'

export const dynamic = 'force-dynamic'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unknown error'
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const leagueId = searchParams.get('league_id')

    const today = new Date().toISOString().split('T')[0]
    const date = from || today

    const fixtures = await getFixtures(date, leagueId || undefined, to || from || undefined)

    return NextResponse.json(fixtures, {
      headers: {
        // Caching is handled by the shared provider-response cache in lib/api-football.ts;
        // avoid CDN-level caching here since it previously cached by path, ignoring query params.
        'Cache-Control': 'no-store',
      },
    })
  } catch (error: unknown) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
