/**
 * Affiliate / Partners Links — the `ad_links` table rows with a Type and a
 * Location slot (mirrors the "Affiliate/Partners Links" admin screen).
 *
 * - Type `menu_link` + Location `link_1` / `link_2` → the two navbar slots.
 *   These MUST render as real, crawlable dofollow backlinks: a plain
 *   `<a href>` in the server-rendered HTML with no `nofollow`, `noreferrer`
 *   or `sponsored` rel, so ranking signals (PageRank) flow to the partner.
 * - Type `partners` → renders on the public /partners page, same rules.
 *
 * NOTE: this module is import-safe for Client Components (types and
 * constants only). The Supabase queries live in
 * `./affiliate-links-server`, which must stay server-only.
 */

export const AFFILIATE_LINK_TYPES = [
  { value: 'partners', label: 'Partners' },
  { value: 'menu_link', label: 'Menu Link' },
] as const

export type AffiliateLinkType = (typeof AFFILIATE_LINK_TYPES)[number]['value']

export const AFFILIATE_LINK_LOCATIONS = [
  { value: 'link_1', label: 'Link 1' },
  { value: 'link_2', label: 'Link 2' },
] as const

export type AffiliateLinkLocation =
  (typeof AFFILIATE_LINK_LOCATIONS)[number]['value']

export function affiliateTypeLabel(type: string): string {
  return AFFILIATE_LINK_TYPES.find((t) => t.value === type)?.label ?? type
}

export function affiliateLocationLabel(location: string): string {
  return (
    AFFILIATE_LINK_LOCATIONS.find((l) => l.value === location)?.label ??
    location
  )
}

export interface AffiliateLink {
  id: string
  title: string
  url: string
  description: string | null
  type: AffiliateLinkType
  location: AffiliateLinkLocation
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Public render shape: only what the navbar needs to emit a backlink. */
export interface MenuBacklink {
  id: string
  title: string
  url: string
  location: string
}
