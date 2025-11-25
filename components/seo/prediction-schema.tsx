'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface PredictionSchemaProps {
  predictions?: Array<{
    home_team: string
    away_team: string
    league: string
    prediction_type: string
    odds: number
    kickoff_time: string
    confidence?: number
  }>
}

export function PredictionSchema({ predictions }: PredictionSchemaProps) {
  const pathname = usePathname()

  useEffect(() => {
    // Only add schema on home page or predictions pages
    if (pathname !== '/' && !pathname.includes('/predictions') && !pathname.includes('/match')) {
      return
    }

    // Create organization schema
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PredictSafe',
      url: 'https://predictsafe.com',
      logo: 'https://predictsafe.com/logo.png',
      description: 'Accurate football predictions and betting tips',
      sameAs: [
        'https://t.me/predictsafe',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        email: 'support@predictsafe.com',
      },
    }

    // Create website schema
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PredictSafe',
      url: 'https://predictsafe.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://predictsafe.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    }

    // Create service schema for prediction service
    const serviceSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: 'Football Prediction Service',
      provider: {
        '@type': 'Organization',
        name: 'PredictSafe',
      },
      description: 'Professional football predictions and betting tips',
      areaServed: 'Worldwide',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NGN',
        availability: 'https://schema.org/InStock',
      },
    }

    // Add schemas to page
    const scripts = [
      { id: 'org-schema', schema: organizationSchema },
      { id: 'website-schema', schema: websiteSchema },
      { id: 'service-schema', schema: serviceSchema },
    ]

    scripts.forEach(({ id, schema }) => {
      // Remove existing script if present
      const existing = document.getElementById(id)
      if (existing) {
        existing.remove()
      }

      // Add new script
      const script = document.createElement('script')
      script.id = id
      script.type = 'application/ld+json'
      script.text = JSON.stringify(schema)
      document.head.appendChild(script)
    })

    // Cleanup on unmount
    return () => {
      scripts.forEach(({ id }) => {
        const script = document.getElementById(id)
        if (script) {
          script.remove()
        }
      })
    }
  }, [pathname, predictions])

  return null
}

