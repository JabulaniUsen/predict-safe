import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatchDetail } from '@/components/match/match-detail'

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const supabase = await createClient()

  // Decode the match ID (format: match_id-predictionType)
  const [fixtureId, predictionType] = matchId.split('-')

  return <MatchDetail matchId={fixtureId} predictionType={predictionType} />
}

