import type { Metadata } from 'next'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { VIPWinningsSection } from '@/components/home/vip-winnings-section'

export const metadata: Metadata = {
  title: 'Previous Wins | PredictSafe',
  description: 'Browse previous VIP wins and track historical winning records on PredictSafe.',
}

export default function PreviousWinsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <VIPWinningsSection />
      </main>
      <Footer />
    </div>
  )
}
