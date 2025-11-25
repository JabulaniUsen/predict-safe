import { createClient } from '@/lib/supabase/server'
import { MatchDetail } from '@/components/match/match-detail'
import { PageLayout } from '@/components/layout/page-layout'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Match Analysis & Predictions | PredictSafe',
  description: 'Detailed football match analysis, statistics, head-to-head records, and expert predictions. Get comprehensive match insights before placing your bets.',
  keywords: [
    'football match analysis',
    'match predictions',
    'football statistics',
    'head to head records',
    'match betting tips',
    'football match preview',
    'soccer match analysis',
    'match odds analysis',
    'football match stats',
    'betting match preview'
  ],
  robots: {
    index: true,
    follow: true,
  },
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const supabase = await createClient()

  // Decode the match ID (format: match_id-predictionType)
  const [fixtureId, predictionType] = matchId.split('-')

  return (
    <PageLayout title="Match Details" subtitle="Comprehensive match analysis and statistics">
      <MatchDetail matchId={fixtureId} predictionType={predictionType} />
    </PageLayout>
  )
}

