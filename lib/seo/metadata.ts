import type { Metadata } from 'next'

/**
 * Standard metadata for admin pages (noindex, nofollow)
 */
export const adminMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

/**
 * Standard metadata for dashboard pages (noindex, nofollow)
 */
export const dashboardMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

/**
 * Standard metadata for private pages (checkout, payment, etc.)
 */
export const privatePageMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

