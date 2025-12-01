import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { AboutSection } from '@/components/home/about-section'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | PredictSafe',
  description:
    'Learn more about PredictSafe, our mission, vision, and how we deliver accurate football predictions and betting tips powered by data, experts, and AI.',
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <AboutSection />
      </main>
      <Footer />
    </div>
  )
}


