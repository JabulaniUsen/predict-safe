'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CircularProgress } from '@/components/ui/circular-progress'
import { formatTime } from '@/lib/utils/date'
import { Fixture, Standing, getFixtures, getStandings } from '@/lib/api-football'
import { Prediction } from '@/types'
import { Loader2, RefreshCw, Trophy, Clock } from 'lucide-react'
import Image from 'next/image'

interface CompetitionHubProps {
  leagueId: string
  competitionName: string
}

const MATCH_RANGES = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'results', label: 'Recent Results' },
] as const

export function CompetitionHub({ leagueId, competitionName }: CompetitionHubProps) {
  const router = useRouter()

  // Predictions
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loadingPredictions, setLoadingPredictions] = useState(true)

  // Matches (fixtures/results/live)
  const [matchRange, setMatchRange] = useState<typeof MATCH_RANGES[number]['id']>('upcoming')
  const [matches, setMatches] = useState<Fixture[]>([])
  const [loadingMatches, setLoadingMatches] = useState(true)

  // Standings
  const [standings, setStandings] = useState<Standing[]>([])
  const [loadingStandings, setLoadingStandings] = useState(true)

  useEffect(() => {
    const loadPredictions = async () => {
      setLoadingPredictions(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('predictions')
          .select('*')
          .eq('league_id', leagueId)
          .order('kickoff_time', { ascending: false })
          .limit(20)
        setPredictions((data as Prediction[]) || [])
      } finally {
        setLoadingPredictions(false)
      }
    }
    loadPredictions()
  }, [leagueId])

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true)
    try {
      const today = new Date()
      let from: string
      let to: string

      if (matchRange === 'results') {
        const past = new Date(today)
        past.setUTCDate(past.getUTCDate() - 7)
        from = past.toISOString().split('T')[0]
        to = today.toISOString().split('T')[0]
      } else {
        from = today.toISOString().split('T')[0]
        const future = new Date(today)
        future.setUTCDate(future.getUTCDate() + 14)
        to = future.toISOString().split('T')[0]
      }

      const data = await getFixtures(from, leagueId, to)
      const sorted = [...data].sort((a, b) =>
        new Date(`${a.match_date} ${a.match_time}`).getTime() -
        new Date(`${b.match_date} ${b.match_time}`).getTime()
      )
      if (matchRange === 'results') sorted.reverse()
      setMatches(sorted)
    } catch (error) {
      console.error('Error loading fixtures:', error)
      setMatches([])
    } finally {
      setLoadingMatches(false)
    }
  }, [leagueId, matchRange])

  useEffect(() => {
    loadMatches()
  }, [loadMatches])

  useEffect(() => {
    const loadStandings = async () => {
      setLoadingStandings(true)
      try {
        const data = await getStandings(leagueId)
        setStandings(data)
      } catch (error) {
        console.error('Error loading standings:', error)
        setStandings([])
      } finally {
        setLoadingStandings(false)
      }
    }
    loadStandings()
  }, [leagueId])

  const getStatusBadge = (match: Fixture) => {
    if (match.match_live === '1') {
      return <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
    }
    if (match.match_status === 'Finished') {
      return <Badge variant="secondary" className="bg-gray-500 text-white">FT</Badge>
    }
    return <Badge variant="outline" className="border-gray-300 text-gray-600">{match.match_time || 'TBD'}</Badge>
  }

  return (
    <Tabs defaultValue="predictions" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="predictions">Predictions</TabsTrigger>
        <TabsTrigger value="matches">Fixtures &amp; Results</TabsTrigger>
        <TabsTrigger value="standings">Standings</TabsTrigger>
      </TabsList>

      {/* Predictions */}
      <TabsContent value="predictions" className="mt-6">
        {loadingPredictions ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" />
          </div>
        ) : predictions.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No predictions for {competitionName} yet. Check back soon!
          </Card>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <Card key={prediction.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {prediction.home_team} vs {prediction.away_team}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(prediction.kickoff_time)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Tip</div>
                      <div className="text-sm font-semibold text-gray-900">{prediction.prediction_type}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Odds</div>
                      <div className="text-sm font-semibold text-gray-900">{prediction.odds.toFixed(2)}</div>
                    </div>
                    <CircularProgress value={prediction.confidence} size={40} strokeWidth={3} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Matches */}
      <TabsContent value="matches" className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {MATCH_RANGES.map((range) => (
              <Button
                key={range.id}
                variant={matchRange === range.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMatchRange(range.id)}
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadMatches} disabled={loadingMatches} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loadingMatches ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {loadingMatches ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" />
          </div>
        ) : matches.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-gray-400" />
            No matches found for this range.
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <Card
                key={match.match_id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${match.match_live === '1' ? 'border-red-500 border-2' : ''}`}
                onClick={() => router.push(`/match/${match.match_id}`)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.team_home_badge && (
                      <Image src={match.team_home_badge} alt={match.match_hometeam_name} width={24} height={24} />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">{match.match_hometeam_name}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {match.match_status === 'Finished' || match.match_live === '1' ? (
                      <span className="text-lg font-bold">{match.match_hometeam_score || '0'} - {match.match_awayteam_score || '0'}</span>
                    ) : (
                      <span className="text-sm text-gray-500">{match.match_time || 'TBD'}</span>
                    )}
                    {getStatusBadge(match)}
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                    <span className="text-sm font-medium text-gray-900 truncate">{match.match_awayteam_name}</span>
                    {match.team_away_badge && (
                      <Image src={match.team_away_badge} alt={match.match_awayteam_name} width={24} height={24} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Standings */}
      <TabsContent value="standings" className="mt-6">
        {loadingStandings ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" />
          </div>
        ) : standings.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No standings available for {competitionName}.
          </Card>
        ) : (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg py-3 px-4">
              <CardTitle className="text-base sm:text-lg">{competitionName} Standings</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 px-2 sm:px-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">#</th>
                      <th className="text-left py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">Team</th>
                      <th className="text-center py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">M</th>
                      <th className="text-center py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">W</th>
                      <th className="text-center py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">GD</th>
                      <th className="text-center py-2 px-2 sm:px-4 text-xs font-bold text-gray-700">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team, idx) => {
                      const goalsDiff = parseInt(team.overall_league_GF || '0') - parseInt(team.overall_league_GA || '0')
                      return (
                        <tr
                          key={team.team_id}
                          className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}
                        >
                          <td className="py-2 px-2 sm:px-4 text-xs font-medium">{team.overall_league_position}</td>
                          <td className="py-2 px-2 sm:px-4 text-xs truncate max-w-[140px] sm:max-w-none">{team.team_name}</td>
                          <td className="py-2 px-2 sm:px-4 text-xs text-center">{team.overall_league_payed}</td>
                          <td className="py-2 px-2 sm:px-4 text-xs text-center">{team.overall_league_W}</td>
                          <td className="py-2 px-2 sm:px-4 text-xs text-center">{goalsDiff > 0 ? '+' : ''}{goalsDiff}</td>
                          <td className="py-2 px-2 sm:px-4 text-xs text-center font-bold text-[#1e40af]">{team.overall_league_PTS}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
