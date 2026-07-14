import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Matches legacy /blog/<uuid> URLs so they can be 301-redirected to the
// current slug-based URL (e.g. /blog/how-to-read-odds).
const BLOG_UUID_PATH = /^\/blog\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

async function lookupBlogSlugById(id: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/blog_posts?id=eq.${id}&select=slug&published=eq.true`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    )
    if (!response.ok) return null
    const rows = await response.json()
    return rows?.[0]?.slug || null
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const uuidMatch = request.nextUrl.pathname.match(BLOG_UUID_PATH)
  if (uuidMatch) {
    const slug = await lookupBlogSlugById(uuidMatch[1])
    if (slug) {
      const url = request.nextUrl.clone()
      url.pathname = `/blog/${slug}`
      return NextResponse.redirect(url, 301)
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
