/**
 * Client-side reader for public site_config values.
 *
 * Goes through the edge-cached `/api/site-config` route instead of hitting
 * Supabase directly, and de-dupes concurrent requests for the same keys
 * within a page load — so the navbar, footer and support widget share one
 * HTTP response instead of each opening their own Supabase round-trip.
 */

const inflight = new Map<string, Promise<Record<string, unknown>>>()

export async function getSiteConfig(keys: string[]): Promise<Record<string, unknown>> {
  const sorted = [...new Set(keys)].sort()
  const cacheKey = sorted.join(',')

  const pending = inflight.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    try {
      const response = await fetch(`/api/site-config?keys=${encodeURIComponent(sorted.join(','))}`)
      if (!response.ok) return {}
      const data = await response.json()
      return (data.values || {}) as Record<string, unknown>
    } catch (error) {
      console.error('Error fetching site config:', error)
      return {}
    } finally {
      inflight.delete(cacheKey)
    }
  })()

  inflight.set(cacheKey, request)
  return request
}
