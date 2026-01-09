import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Set cookies on request object
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // Set cookies on response with proper options preserved
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              // Ensure important cookie options are set
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
              sameSite: options?.sameSite ?? 'lax',
              path: options?.path ?? '/',
            })
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Handle JWT errors by attempting to refresh the session
  if (authError && authError.message?.includes('JWT')) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Session exists, try to refresh it
      await supabase.auth.refreshSession()
    }
  }

  // Explicitly refresh session if it's about to expire (within 5 minutes)
  if (user) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session && session.expires_at) {
      const expiresIn = session.expires_at - Math.floor(Date.now() / 1000)
      // Refresh if session expires within 5 minutes
      if (expiresIn < 300) {
        await supabase.auth.refreshSession()
      }
    }
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/signup') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/admin'))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you'll be causing the browser and server to go out of
  // sync and terminate the user's session prematurely.

  return supabaseResponse
}

