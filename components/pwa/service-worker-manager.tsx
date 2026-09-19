'use client'

import { useEffect } from 'react'

/**
 * Registers the service worker and, just as importantly, cleans up after the
 * one next-pwa used to install.
 *
 * Users were repeatedly told to clear their browser data to get PredictSafe
 * working - stale predictions in the morning, a score updater that only worked
 * after a cache clear, a sign-in page that misbehaved until site data was
 * wiped, and at least one report of the site being unreachable in a normal
 * window but fine in incognito. All of those are the signature of a service
 * worker serving an old build and old API responses.
 *
 * Two things happen here:
 *
 *  1. Any service worker registered under a scope we no longer use is
 *     unregistered, and every cache left over from the old Workbox setup is
 *     deleted. This runs for existing visitors without them doing anything.
 *
 *  2. The current worker is registered and checked for updates on every load,
 *     and when a new one takes over the page reloads once so the visitor is on
 *     the new build immediately rather than one navigation later.
 */
export function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // Caches created by the previous next-pwa/Workbox configuration. These are
    // what held the stale API responses and the stale build manifest.
    const LEGACY_CACHE_PREFIXES = [
      'workbox-',
      'start-url',
      'apis',
      'others',
      'static-',
      'next-image',
      'google-fonts',
      'cross-origin',
      'pages-rsc',
      'static-js-assets',
      'static-style-assets',
      'static-data-assets',
      'static-image-assets',
      'static-font-assets',
      'static-audio-assets',
      'static-video-assets',
    ]

    const cleanUpLegacyCaches = async () => {
      if (!('caches' in window)) return
      try {
        const names = await caches.keys()
        await Promise.all(
          names
            .filter((name) => LEGACY_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
            .map((name) => caches.delete(name))
        )
      } catch (error) {
        // Storage can be unavailable (private mode, blocked site data). The
        // worker's own activate handler clears these too, so this is belt and
        // braces rather than the only path.
        console.debug('Cache cleanup skipped:', error)
      }
    }

    const register = async () => {
      await cleanUpLegacyCaches()

      try {
        // Drop registrations whose scope isn't ours any more, so an old worker
        // can't keep intercepting requests alongside the new one.
        const existing = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          existing
            .filter((registration) => {
              const scriptUrl = registration.active?.scriptURL || ''
              return scriptUrl !== '' && !scriptUrl.endsWith('/sw.js')
            })
            .map((registration) => registration.unregister())
        )

        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // Ask for an update on every load rather than waiting for the
        // browser's own 24-hour check.
        registration.update().catch(() => {})

        let refreshing = false
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Guard against the reload loop this pattern is famous for.
          if (refreshing) return
          refreshing = true
          window.location.reload()
        })

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // A new worker is ready and an old one is in charge: hand over now.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage('SKIP_WAITING')
            }
          })
        })
      } catch (error) {
        // A failed registration must never break the page - the site works
        // perfectly well without a service worker.
        console.debug('Service worker registration failed:', error)
      }
    }

    // Registration is not urgent; let the page finish loading first.
    if (document.readyState === 'complete') {
      void register()
    } else {
      window.addEventListener('load', register, { once: true })
      return () => window.removeEventListener('load', register)
    }
  }, [])

  return null
}
