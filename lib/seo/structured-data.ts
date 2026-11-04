/**
 * Schema.org JSON-LD builders.
 *
 * Rendered server-side (see components/seo/json-ld.tsx) so crawlers that don't
 * run JavaScript — which includes most AI crawlers — still see it.
 *
 * Nodes share stable @ids so the Organization/WebSite described on the
 * homepage are recognisably the same entities referenced from articles.
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.predictsafe.com').replace(/\/+$/, '')

const SITE_NAME = 'PredictSafe'
const SITE_DESCRIPTION =
  'PredictSafe is a global football predictions and match analysis platform covering major domestic leagues and international competitions, with free football predictions, premium prediction packages, correct-score predictions and live scores.'

const ORGANIZATION_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

/**
 * Who articles are credited to — used for both the visible byline and the
 * BlogPosting author, which must match. Posts have no named writer (the
 * byline used to read "Admin"), so they are credited to the organization.
 * To credit a real writer, switch to:
 *   { '@type': 'Person', name: 'Jane Doe', url: `${SITE_URL}/about` }
 */
export const BLOG_AUTHOR = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
} as const

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`
}

interface OrganizationOptions {
  email?: string
  sameAs?: string[]
}

export function organizationNode({ email, sameAs = [] }: OrganizationOptions = {}) {
  const profiles = sameAs.filter((url) => /^https?:\/\//i.test(url))
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: {
      '@type': 'ImageObject',
      url: absoluteUrl('/logo.png'),
      width: 1563,
      height: 1563,
    },
    description: SITE_DESCRIPTION,
    ...(email ? { email } : {}),
    ...(profiles.length ? { sameAs: profiles } : {}),
  }
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  }
}

interface WebPageOptions {
  path: string
  name: string
  description?: string
}

export function webPageNode({ path, name, description }: WebPageOptions) {
  const url = absoluteUrl(path)
  return {
    '@type': 'WebPage',
    '@id': url,
    url,
    name,
    ...(description ? { description } : {}),
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en',
  }
}

export function homePageGraph(options: OrganizationOptions & { title: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationNode(options),
      websiteNode(),
      {
        ...webPageNode({ path: '/', name: options.title, description: options.description }),
        about: { '@id': ORGANIZATION_ID },
      },
    ],
  }
}

interface BlogPostingOptions {
  slug: string
  title: string
  description: string
  imageUrl?: string
  publishedAt: string
  updatedAt?: string | null
  keywords?: string[]
}

export function blogPostingGraph({
  slug,
  title,
  description,
  imageUrl,
  publishedAt,
  updatedAt,
  keywords = [],
}: BlogPostingOptions) {
  const path = `/blog/${slug}`
  const url = absoluteUrl(path)
  // updated_at can predate published_at (a draft edited, then published), so
  // never report a modification earlier than publication.
  const dateModified =
    updatedAt && new Date(updatedAt).getTime() > new Date(publishedAt).getTime() ? updatedAt : publishedAt

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: title,
        description,
        url,
        mainEntityOfPage: { '@id': url },
        ...(imageUrl ? { image: [absoluteUrl(imageUrl)] } : {}),
        datePublished: publishedAt,
        dateModified,
        author: BLOG_AUTHOR,
        publisher: { '@id': ORGANIZATION_ID },
        isPartOf: { '@id': WEBSITE_ID },
        ...(keywords.length ? { keywords: keywords.join(', ') } : {}),
        inLanguage: 'en',
      },
      webPageNode({ path, name: title, description }),
      // Repeated here so the publisher resolves on this page: crawlers don't
      // follow @id references across pages.
      organizationNode(),
      websiteNode(),
    ],
  }
}
