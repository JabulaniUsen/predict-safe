import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Exchanges the one-time code from a Supabase email link for a session.
 *
 * Password-reset and email-confirmation links land here first, then get
 * forwarded to wherever `next` points (the reset form, usually).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  // Only ever redirect within this site - `next` comes from the URL.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('That link is missing its security code. Please request a new one.')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('That link has expired or has already been used. Please request a new one.')}`
    )
  }

  return NextResponse.redirect(`${origin}${safeNext}`)
}
