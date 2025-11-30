'use client'

import { useEffect } from 'react'

export function PWAHead() {
  useEffect(() => {
    // Add manifest link
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = '/manifest.json'
    document.head.appendChild(manifestLink)

    // Add apple-touch-icon
    const appleIconLink = document.createElement('link')
    appleIconLink.rel = 'apple-touch-icon'
    appleIconLink.href = '/icons/icon-192x192.png'
    document.head.appendChild(appleIconLink)

    // Add apple-mobile-web-app meta tags
    const metaTags = [
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      { name: 'apple-mobile-web-app-title', content: 'PredictSafe' },
    ]

    metaTags.forEach(({ name, content }) => {
      let meta = document.querySelector(`meta[name="${name}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', name)
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    })

    return () => {
      // Cleanup on unmount
      const manifest = document.querySelector('link[rel="manifest"]')
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]')
      if (manifest) manifest.remove()
      if (appleIcon) appleIcon.remove()
    }
  }, [])

  return null
}

