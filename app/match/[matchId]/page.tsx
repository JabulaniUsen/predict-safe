import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatchDetail } from '@/components/match/match-detail'
import { PageLayout } from '@/components/layout/page-layout'

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

