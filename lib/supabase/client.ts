import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>

let browserClient: BrowserClient | null = null

/**
 * Singleton browser client.
 *
 * Every `createBrowserClient` instance runs its own background token-refresh
 * timer. The old code created a brand-new client on every call — and several
 * components (admin layout, predictions list, home premium section) do that
 * on a 30-second poll. When the 1-hour access token expired, all live
 * instances fired a refresh with the SAME refresh token at once. Supabase
 * rotates refresh tokens with reuse detection, so the losers of that race get
 * "refresh token already used" and wipe the stored session — which is exactly
 * a random-looking logout, typically around the top of the hour or after the
 * tab has been open a while.
 *
 * Sharing one instance means exactly one refresh timer, so no race.
 */
export function createClient(): BrowserClient {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClient
}

