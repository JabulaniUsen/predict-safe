import { createClient } from '@/lib/supabase/server'
import type { MenuBacklink } from './affiliate-links'

/**
 * Server-only data layer for Affiliate / Partners Links.
 *
 * Kept in a separate module from `./affiliate-links` (which is safe to
 * import from Client Components) because these queries use the
 * cookie-based server Supabase client (`next/headers`). Importing this
 * module from any Client Component would leak `next/headers` into the
 * browser bundle and fail the build.
 */

/**
 * Active navbar backlinks (Type = Menu Link), ordered by slot then by the
 * admin's display order. Only active rows are returned, so anything the
 * admin unpublishes disappears from the rendered page and can never be
 * crawled as a link.
 */
export async function getActiveMenuBacklinks(): Promise<MenuBacklink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ad_links')
    .select('id, title, url, location')
    .eq('type', 'menu_link')
    .eq('is_active', true)
    .order('location', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as MenuBacklink[]
}

/** Active partner links (Type = Partners) for the public /partners page. */
export async function getActivePartnerLinks(): Promise<MenuBacklink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ad_links')
    .select('id, title, url, location')
    .eq('type', 'partners')
    .eq('is_active', true)
    .order('location', { ascending: true })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as MenuBacklink[]
}
