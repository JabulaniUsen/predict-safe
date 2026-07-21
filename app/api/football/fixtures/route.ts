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
        // `dynamic = 'force-dynamic'` above guarantees this always recomputes
        // per request (correctly varying by from/to/league_id), so it's safe
        // to also let Vercel's edge cache the response for a short window —
        // that's what actually cuts serverless invocations for repeat
        // visitors, on top of the in-process cache in lib/api-football.ts.
        // Kept short since fixtures carry live scores/status.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (error: unknown) {
    console.error('API Football Error:', error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
