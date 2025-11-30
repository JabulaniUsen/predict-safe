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
  // Handle URL encoding - prediction type might contain spaces or special chars
  const decodedMatchId = decodeURIComponent(matchId)
  const parts = decodedMatchId.split('-')
  const fixtureId = parts[0]
  // Join the rest as prediction type (in case it contains dashes)
  const predictionType = parts.slice(1).join('-')

  // Try to fetch prediction from database (for stored predictions)
  let predictionData = null
  if (fixtureId && predictionType) {
    const { data: predictions } = await supabase
      .from('predictions')
      .select('*')
      .eq('plan_type', 'free')
      .ilike('prediction_type', `%${predictionType}%`)
      .limit(10)

    if (predictions && predictions.length > 0) {
      const exactMatch = predictions.find((p: any) => 
        p.prediction_type.toLowerCase() === predictionType.toLowerCase() ||
        p.prediction_type.toLowerCase().includes(predictionType.toLowerCase())
      )
      predictionData = exactMatch || predictions[0]
    }
  }

  return (
    <PageLayout title="Match Details" subtitle="Comprehensive match analysis and statistics">
      <MatchDetail 
        matchId={fixtureId} 
        predictionType={predictionType}
        predictionData={predictionData}
      />
    </PageLayout>
  )
}

