/**
 * Link Partnerships — shared constants, types and helpers.
 *
 * A database record here is configuration, NOT a backlink. The actual
 * outgoing backlink exists only when a public placement component renders a
 * real, crawlable HTML anchor (<a href>) for an ACTIVE record. Incoming links
 * (partner → PredictSafe) are tracked here but only exist when the partner
 * actually publishes them on their own site.
 */

export const LINK_PLACEMENTS = [
  { value: 'recommended_platforms', label: 'Recommended Platforms' },
  { value: 'partners', label: 'Partners' },
  { value: 'resources', label: 'Resources' },
] as const

export type LinkPlacementId =
  (typeof LINK_PLACEMENTS)[number]['value'] | (string & {})

export const LINK_ATTRIBUTES = [
  { value: 'standard', label: 'Follow / Standard', description: 'Plain <a href> with no rel — passes ranking signals.' },
  { value: 'nofollow', label: 'Nofollow', description: 'Renders rel="nofollow".' },
  { value: 'sponsored', label: 'Sponsored', description: 'Renders rel="sponsored" (paid placements).' },
  { value: 'ugc', label: 'UGC', description: 'Renders rel="ugc" (user-generated content).' },
] as const

export type LinkAttribute = (typeof LINK_ATTRIBUTES)[number]['value']

export const PARTNERSHIP_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number]['value']

export const THEIR_LINK_STATUSES = [
  { value: 'expected', label: 'Expected' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'removed', label: 'Removed' },
] as const

export type TheirLinkStatus = (typeof THEIR_LINK_STATUSES)[number]['value']

export interface LinkPartnership {
  id: string
  partner_name: string
  partner_domain: string
  partner_website: string
  target_url: string
  anchor_text: string
  placement: string
  link_attribute: LinkAttribute
  status: PartnershipStatus
  display_order: number
  their_backlink_url: string | null
  our_target_url: string | null
  their_anchor_text: string | null
  their_link_status: TheirLinkStatus
  notes: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

/** Public render shape: only what a placement needs to emit an anchor. */
export interface ActiveExternalLink {
  id: string
  target_url: string
  anchor_text: string
  placement: string
  link_attribute: LinkAttribute
}

/**
 * Map the admin-controlled link attribute to a real `rel` value.
 * A standard/followed link intentionally has NO rel attribute — there is no
 * such thing as rel="dofollow".
 */
export function relFor(attribute: LinkAttribute): string | undefined {
  switch (attribute) {
    case 'nofollow':
      return 'nofollow'
    case 'sponsored':
      return 'sponsored'
    case 'ugc':
      return 'ugc'
    case 'standard':
    default:
      return undefined
  }
}

export function placementLabel(placement: string): string {
  return (
    LINK_PLACEMENTS.find((p) => p.value === placement)?.label ?? placement
  )
}

/** Extract a bare domain from a URL for display / dedupe checks. */
export function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}
