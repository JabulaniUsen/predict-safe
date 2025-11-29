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

export default function HomePage() {
  return (
    <>
      <PredictionSchema />
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={<div className="py-8"><div className="container mx-auto px-4">Loading predictions...</div></div>}>
          <FreePredictionsSection />
        </Suspense>
        <VIPWinningsSection />
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
