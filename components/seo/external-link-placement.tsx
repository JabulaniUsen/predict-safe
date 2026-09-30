import { createClient } from '@/lib/supabase/server'
import {
  relFor,
  type ActiveExternalLink,
  type LinkAttribute,
} from '@/lib/link-partnerships'

/**
 * Retrieve the ACTIVE outgoing links assigned to a placement.
 *
 * This is the data layer behind every public link-partnership slot:
 * only rows with status = 'active' are returned, ordered for stable output.
 * Anything pending/inactive never reaches the rendered page, so it can never
 * be crawled as a link.
 */
export async function getActiveExternalLinks(
  placement: string
): Promise<ActiveExternalLink[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('link_partnerships')
    .select('id, target_url, anchor_text, placement, link_attribute')
    .eq('placement', placement)
    .eq('status', 'active')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as ActiveExternalLink[]
}

interface ExternalLinkPlacementProps {
  placement: string
  /** Heading rendered above the link list (e.g. "Recommended Platforms"). */
  title?: string
  /** Extra classes for the wrapping nav element. */
  className?: string
  /** Extra classes for the underlying <ul>. */
  listClassName?: string
  /** Extra classes for each anchor. */
  linkClassName?: string
}

/**
 * Server Component — renders a REAL, crawlable HTML hyperlink per active
 * partnership in the given placement:
 *
 *   <a href="https://100percentsurewins.com/">100 Percent Sure Wins</a>
 *
 * Because this is a Server Component, the anchors are present in the SSR HTML,
 * so search-engine crawlers and partner SEO tools can discover PredictSafe as
 * a referring domain. There is intentionally no client-side fetching, no
 * onClick navigation, and no hidden/image-only links here.
 *
 * Renders nothing when the placement has no active links.
 */
export async function ExternalLinkPlacement({
  placement,
  title,
  className,
  listClassName,
  linkClassName,
}: ExternalLinkPlacementProps) {
  const links = await getActiveExternalLinks(placement)
  if (links.length === 0) return null

  return (
    <nav aria-label={title ?? `External links: ${placement}`} className={className}>
      {title && <h4 className="text-lg font-bold mb-4 text-white">{title}</h4>}
      <ul className={listClassName ?? 'space-y-3 text-sm'}>
        {links.map((link) => {
          const rel = relFor(link.link_attribute as LinkAttribute)
          return (
            <li key={link.id}>
              <a
                href={link.target_url}
                {...(rel ? { rel } : {})}
                className={linkClassName ?? 'text-gray-300 hover:text-white transition-colors'}
              >
                {link.anchor_text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
