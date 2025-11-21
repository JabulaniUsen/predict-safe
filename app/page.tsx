import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { HeroSection } from '@/components/home/hero-section'
import { FreePredictionsSection } from '@/components/home/free-predictions-section'
import { VIPPackagesSection } from '@/components/home/vip-packages-section'
import { VIPWinningsSection } from '@/components/home/vip-winnings-section'
import { ProfitMultiplierSection } from '@/components/home/profit-multiplier-section'
import { CorrectScorePreviewSection } from '@/components/home/correct-score-preview-section'
import { BlogSection } from '@/components/home/blog-section'
import { LeagueTableSection } from '@/components/home/league-table-section'
import { AboutSection } from '@/components/home/about-section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main>
        <HeroSection />
        <FreePredictionsSection />
        
        {/* CTA Buttons Section */}
        <section className="py-16 bg-[#1e40af]">
          <div className="container mx-auto px-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button 
                size="lg" 
                asChild 
                className="text-lg bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white px-8 py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Link href="/dashboard">Subscribe to VIP</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                asChild 
                className="text-lg bg-white text-[#1e40af] border-2 border-white hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a] px-8 py-6 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <a href="https://t.me/joinsurefixedwin" target="_blank" rel="noopener noreferrer">
                  Join Telegram
                </a>
              </Button>
            </div>
          </div>
        </section>

        <VIPWinningsSection />
        <VIPPackagesSection />
        <ProfitMultiplierSection />
        <CorrectScorePreviewSection />
        <BlogSection />
        <LeagueTableSection />
        <AboutSection />
        <Footer />
      </PageLayout>
    </div>
  )
}
