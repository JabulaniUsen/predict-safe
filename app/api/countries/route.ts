import { NextResponse } from 'next/server'
import { WORLD_COUNTRIES } from '@/lib/countries'

export async function GET() {
  return NextResponse.json(WORLD_COUNTRIES)
}
