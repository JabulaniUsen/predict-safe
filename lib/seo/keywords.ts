/**
 * SEO Keywords Mapping
 * Maps keywords to specific pages for better SEO targeting
 */

export const pageKeywords: Record<string, string[]> = {
  '/': [
    'free football predictions',
    'football betting tips',
    'soccer predictions today',
    'daily football tips',
    'accurate betting predictions',
    'VIP football predictions',
    'correct score predictions',
    'football betting advice',
    'sports betting tips',
    'football analysis',
  ],
  '/subscriptions': [
    'VIP football predictions',
    'premium betting tips',
    'football prediction subscription',
    'betting tips subscription',
    'VIP betting package',
    'premium football tips',
    'correct score predictions subscription',
    'daily 2 odds subscription',
    'profit multiplier predictions',
    'football betting plans',
  ],
  '/blog': [
    'football betting blog',
    'betting tips blog',
    'soccer predictions blog',
    'football analysis',
    'betting strategies',
    'football betting advice',
    'sports betting insights',
    'football tips and tricks',
    'betting guides',
    'football prediction analysis',
  ],
  '/match': [
    'football match analysis',
    'match predictions',
    'football statistics',
    'head to head records',
    'match betting tips',
    'football match preview',
    'soccer match analysis',
    'match odds analysis',
    'football match stats',
    'betting match preview',
  ],
  '/faq': [
    'football predictions FAQ',
    'betting tips questions',
    'predictions help',
    'betting tips FAQ',
    'football betting questions',
    'predictions support',
  ],
  '/about': [
    'about PredictSafe',
    'football prediction service',
    'betting tips provider',
    'who we are',
    'predictions company',
  ],
  '/contact': [
    'contact PredictSafe',
    'football predictions support',
    'betting tips contact',
    'customer support',
    'help center',
  ],
}

/**
 * Get keywords for a specific page path
 */
export function getKeywordsForPage(path: string): string[] {
  // Try exact match first
  if (pageKeywords[path]) {
    return pageKeywords[path]
  }

  // Try prefix match for dynamic routes
  for (const [key, keywords] of Object.entries(pageKeywords)) {
    if (path.startsWith(key)) {
      return keywords
    }
  }

  // Default keywords
  return [
    'football predictions',
    'betting tips',
    'soccer predictions',
    'football betting',
  ]
}

/**
 * Get primary keyword for a page
 */
export function getPrimaryKeyword(path: string): string {
  const keywords = getKeywordsForPage(path)
  return keywords[0] || 'football predictions'
}

