import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

/**
 * A Supabase client that bypasses RLS, for server-side writes made on nobody's
 * behalf - currently only caching generated free picks.
 *
 * Returns `null` when `SUPABASE_SERVICE_ROLE_KEY` isn't configured, so callers
 * must decide what to do without it rather than crashing. Never import this
 * from a Client Component: the key must never reach the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) return null

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
