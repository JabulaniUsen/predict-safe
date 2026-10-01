import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Single batched read for public site_config values.
 *
 * WHY: the navbar, footer and support widget each fired their own
 * site_config query straight at Supabase on every page view (4+ HTTPS
 * round-trips per visitor just for config). Those requests add up against
 * the project's request/egress quota. This route serves them all in one
 * edge-cached response instead.
 */

// Only these keys are ever exposed here. Anything sensitive must never be
// added to this list.
const PUBLIC_KEYS = new Set([
  'site_header',
  'site_subheader',
  'hero_headline',
  'hero_subheader',
  'telegram_link',
  'contact_email',
  'whatsapp_number',
  'whatsapp_numbers',
  'social_links',
  'chat_support_url',
])

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get('keys') || ''
    const keys = raw.split(',').map((k) => k.trim()).filter((k) => PUBLIC_KEYS.has(k))

    if (keys.length === 0) {
      return NextResponse.json({ error: 'No valid keys requested' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', keys)

    if (error) throw error

    const values: Record<string, unknown> = {}
    for (const row of (data as Array<{ key: string; value: unknown }> | null) || []) {
      values[row.key] = row.value
    }

    return NextResponse.json(
      { values },
      {
        // Config changes rarely (admin edits). A 10-minute edge cache means
        // thousands of page views share one Supabase query.
        headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600' },
      }
    )
  } catch (error: unknown) {
    console.error('[site-config] request failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to load site config'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
