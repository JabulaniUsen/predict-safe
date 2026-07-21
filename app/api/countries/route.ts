import { NextResponse } from 'next/server'
import { WORLD_COUNTRIES } from '@/lib/countries'

export async function GET() {
  return NextResponse.json(WORLD_COUNTRIES, {
    // Static, code-bundled data — only changes on deploy, so cache it hard.
    headers: {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  })
}
