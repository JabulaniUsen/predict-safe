import { Suspense } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { FreePredictionsSection } from '@/components/home/free-predictions-section'
import { WhatWeOfferSection } from '@/components/home/what-we-offer-section'
import { VIPWinningsSection } from '@/components/home/vip-winnings-section'
import { PremiumPredictionsSection } from '@/components/home/premium-predictions-section'
import { BlogSection } from '@/components/home/blog-section'
import { LeagueTableSection } from '@/components/home/league-table-section'
import { AboutSection } from '@/components/home/about-section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PredictionSchema } from '@/components/seo/prediction-schema'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: "Free Football Predictions Today | Accurate Betting Tips & Expert Analysis",
  description: "Get free daily football predictions, betting tips, and expert analysis. Access VIP packages for premium predictions, correct score tips, and live scores. Trusted by thousands of bettors worldwide.",
  keywords: [
    "free football predictions",
    "football betting tips",
    "soccer predictions today",
    "daily football tips",
    "accurate betting predictions",
    "VIP football predictions",
    "correct score predictions",
    "football betting advice",
    "sports betting tips",
    "football analysis",
    "betting predictions",
    "soccer betting tips"
  ],
  openGraph: {
    title: "Free Football Predictions Today | Accurate Betting Tips",
    description: "Get free daily football predictions, betting tips, and expert analysis. Access VIP packages for premium predictions.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function HomePage() {
  // Fetch hero config server-side to avoid client-side flash and extra round-trip
  const supabase = await createClient()
  const { data: configRows } = await supabase
    .from('site_config')
    .select('key, value')
    .in('key', ['hero_headline', 'hero_subtext', 'telegram_link', 'whatsapp_number', 'whatsapp_numbers'])

  const config = Object.fromEntries(
    (configRows ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value ?? undefined])
  ) as Record<string, unknown>

  const whatsappNumberFromConfig = (() => {
    const single = config.whatsapp_number
    if (typeof single === 'string' && single.trim()) {
      return single.trim()
    }

    const legacy = config.whatsapp_numbers
    if (typeof legacy === 'string') {
      try {
        const parsed = JSON.parse(legacy)
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
          return parsed[0].trim()
        }
      } catch {
        return ''
      }
    }

    if (Array.isArray(legacy) && typeof legacy[0] === 'string' && legacy[0].trim()) {
      return legacy[0].trim()
    }

    return ''
  })()

  return (
    <>
      <PredictionSchema />
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <HeroSection
          headline={typeof config.hero_headline === 'string' ? config.hero_headline : undefined}
          subtext={typeof config.hero_subtext === 'string' ? config.hero_subtext : undefined}
          telegramLink={typeof config.telegram_link === 'string' ? config.telegram_link : undefined}
          whatsappNumber={whatsappNumberFromConfig}
        />
        <Suspense fallback={<div className="py-8"><div className="container mx-auto px-4">Loading predictions...</div></div>}>
          <FreePredictionsSection />
        </Suspense>
        <VIPWinningsSection showSeeMoreLink />
        <PremiumPredictionsSection />
        <WhatWeOfferSection />
        
        {/* CTA Buttons Section */}
        <section className="py-8 lg:py-16 bg-[#1e40af]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-center">
              <Button 
                size="lg" 
                asChild 
                className="text-sm sm:text-base lg:text-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white px-6 py-4 sm:px-8 sm:py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Link href="/subscriptions">Subscribe to VIP</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="text-sm sm:text-base lg:text-lg bg-white text-[#1e40af] border-2 border-white hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a] px-6 py-4 sm:px-8 sm:py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <a href="https://t.me/joinsurefixedwin" target="_blank" rel="noopener noreferrer">
                  Join Telegram
                </a>
              </Button>
            </div>
          </div>
        </section>

        <BlogSection />
        <LeagueTableSection />
        <AboutSection />
      </main>
      <Footer />
    </div>
    </>
  )
}
