/*
 * PredictSafe service worker.
 *
 * Replaces the one next-pwa used to generate. That one was built from
 * Workbox's stock config, which did two things that caused real problems:
 *
 *  1. It precached a build manifest and served from it first. When a new
 *     version was deployed, browsers holding the old manifest kept asking for
 *     JavaScript chunks that no longer existed, and the page failed to boot -
 *     which is what "this site can't be reached" in a normal window but fine
 *     in incognito actually was. Clearing site data "fixed" it by discarding
 *     the manifest.
 *
 *  2. It applied a NetworkFirst strategy to `/api/*`, so a failed or slow
 *     request fell back to a cached response. That is how stale predictions
 *     and stale scores kept reappearing.
 *
 * This worker precaches nothing, never caches an API response, and never
 * serves a cached HTML document while the network is reachable. The only thing
 * it caches is content-hashed static assets, which are immutable by
 * construction and safe.
 *
 * Bump CACHE_VERSION to force every client to drop its caches on next load.
 */

const CACHE_VERSION = 'v3'
const ASSET_CACHE = `predictsafe-assets-${CACHE_VERSION}`
const PAGE_FALLBACK_CACHE = `predictsafe-pages-${CACHE_VERSION}`
// Served from public/offline.html, but the host serves it at the extensionless
// path and 307s /offline.html -> /offline. Caching a redirected response fails,
// so the worker must ask for the canonical URL directly.
const OFFLINE_URL = '/offline'

/**
 * Requests that must always hit the network and must never be stored.
 * Anything user-specific or time-sensitive belongs here.
 */
const NEVER_CACHE = [
  /^\/api\//,
  /^\/auth\//,
  /^\/admin/,
  /^\/dashboard/,
  /^\/checkout/,
  /^\/subscribe/,
  /^\/payment/,
  /^\/login/,
  /^\/signup/,
  /^\/forgot-password/,
  /^\/reset-password/,
]

/** Content-hashed or otherwise immutable assets - safe to serve from cache. */
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/hero-pics/') ||
    url.pathname.startsWith('/avatars/') ||
    /\.(?:woff2?|ttf|otf)$/.test(url.pathname)
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGE_FALLBACK_CACHE)
      // Best-effort: an offline page is a nicety, not a reason to fail install.
      await cache.add(OFFLINE_URL).catch(() => {})
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache from a previous version, including all the ones
      // next-pwa created ('start-url', 'apis', 'others', 'static-style-assets'
      // and friends). This is what un-sticks browsers carrying stale state.
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name !== ASSET_CACHE && name !== PAGE_FALLBACK_CACHE)
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  // Leave cross-origin requests (ads, analytics, provider badges) alone.
  if (url.origin !== self.location.origin) return

  if (NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) {
    // Not calling respondWith means the browser handles it normally - no
    // interception, no storage.
    return
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
  }
})

/**
 * Immutable assets: serve from cache, fall back to network, and store what we
 * fetch. These filenames change whenever their contents do, so a cached copy
 * can never be out of date.
 */
async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    // A missing asset must surface as a failed request, not a stale one.
    throw error
  }
}

/**
 * Pages: always try the network first, so a deploy takes effect immediately.
 * The cache is only ever a fallback for genuinely being offline, and it is
 * never allowed to answer while the network is working.
 */
async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_FALLBACK_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached

    const offline = await cache.match(OFFLINE_URL)
    if (offline) return offline

    throw error
  }
}
