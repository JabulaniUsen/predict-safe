'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Lock, CalendarIcon } from 'lucide-react'
import { Prediction, CorrectScorePrediction } from '@/types'
import { formatTime, getDateRange } from '@/lib/utils/date'
import { CircularProgress } from '@/components/ui/circular-progress'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'

interface PremiumPrediction {
  id: string
  home_team: string
  away_team: string
  league: string
  prediction_type?: string
  score_prediction?: string
  odds: number
  confidence?: number
  kickoff_time: string
  status: 'not_started' | 'live' | 'finished'
  type: 'profit_multiplier' | 'correct_score'
  home_team_logo?: string | null
  away_team_logo?: string | null
  home_score?: string | null
  away_score?: string | null
}

export function PremiumPredictionsSection() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profitMultiplierPredictions, setProfitMultiplierPredictions] = useState<PremiumPrediction[]>([])
  const [correctScorePredictions, setCorrectScorePredictions] = useState<PremiumPrediction[]>([])
  const [loading, setLoading] = useState(true)

  // Separate date navigation for Profit Multiplier
  const [profitMultiplierDateType, setProfitMultiplierDateType] = useState<'previous' | 'today' | 'tomorrow' | 'custom'>('today')
  const [profitMultiplierCustomDate, setProfitMultiplierCustomDate] = useState<string>('')
  const [profitMultiplierDaysBack, setProfitMultiplierDaysBack] = useState<number>(0)

  // Separate date navigation for Correct Score
  const [correctScoreDateType, setCorrectScoreDateType] = useState<'previous' | 'today' | 'tomorrow' | 'custom'>('today')
  const [correctScoreCustomDate, setCorrectScoreCustomDate] = useState<string>('')
  const [correctScoreDaysBack, setCorrectScoreDaysBack] = useState<number>(0)

  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Get separate date ranges for each section
      const profitMultiplierDateRange = getDateRange(profitMultiplierDateType, profitMultiplierCustomDate || undefined, profitMultiplierDaysBack)
      const correctScoreDateRange = getDateRange(correctScoreDateType, correctScoreCustomDate || undefined, correctScoreDaysBack)

      const profitMultiplierFromTimestamp = `${profitMultiplierDateRange.from}T00:00:00.000Z`
      const profitMultiplierToTimestamp = `${profitMultiplierDateRange.to}T23:59:59.999Z`

      const correctScoreFromTimestamp = `${correctScoreDateRange.from}T00:00:00.000Z`
      const correctScoreToTimestamp = `${correctScoreDateRange.to}T23:59:59.999Z`

      console.log('🔍 Premium Predictions - Fetching data:', {
        profitMultiplierDateRange: {
          from: profitMultiplierFromTimestamp,
          to: profitMultiplierToTimestamp,
          dateType: profitMultiplierDateType,
          customDate: profitMultiplierCustomDate,
          daysBack: profitMultiplierDaysBack
        },
        correctScoreDateRange: {
          from: correctScoreFromTimestamp,
          to: correctScoreToTimestamp,
          dateType: correctScoreDateType,
          customDate: correctScoreCustomDate,
          daysBack: correctScoreDaysBack
        }
      })

      const [profitMultiplierResult, correctScoreResult] = await Promise.all([
        supabase
          .from('predictions')
          .select('*')
          .eq('plan_type', 'profit_multiplier')
          .gte('kickoff_time', profitMultiplierFromTimestamp)
          .lte('kickoff_time', profitMultiplierToTimestamp)
          .order('kickoff_time', { ascending: true })
          .limit(5),
        // Correct score predictions are stored in the main predictions table with plan_type = 'correct_score'
        supabase
          .from('predictions')
          .select('*')
          .eq('plan_type', 'correct_score')
          .gte('kickoff_time', correctScoreFromTimestamp)
          .lte('kickoff_time', correctScoreToTimestamp)
          .order('kickoff_time', { ascending: true })
          .limit(5)
      ])

      console.log('📊 Premium Predictions - Query Results:', {
        profitMultiplier: {
          data: profitMultiplierResult.data,
          error: profitMultiplierResult.error,
          count: profitMultiplierResult.data?.length || 0
        },
        correctScore: {
          data: correctScoreResult.data,
          error: correctScoreResult.error,
          count: correctScoreResult.data?.length || 0
        }
      })

      if (profitMultiplierResult.error) {
        console.error('❌ Profit Multiplier Query Error:', profitMultiplierResult.error)
      }

      if (correctScoreResult.error) {
        console.error('❌ Correct Score Query Error:', correctScoreResult.error)
      }

      const profitMultiplier: PremiumPrediction[] = []
      const correctScore: PremiumPrediction[] = []

      // Process profit multiplier predictions
      if (profitMultiplierResult.data) {
        console.log('✅ Processing Profit Multiplier Predictions:', profitMultiplierResult.data.length, 'items')
        profitMultiplierResult.data.forEach((pred: Prediction) => {
          profitMultiplier.push({
            id: pred.id,
            home_team: pred.home_team,
            away_team: pred.away_team,
            league: pred.league,
            prediction_type: pred.prediction_type || undefined,
            odds: pred.odds,
            confidence: pred.confidence,
            kickoff_time: pred.kickoff_time,
            status: pred.status,
            type: 'profit_multiplier'
          })
        })
        console.log('📦 Processed Profit Multiplier:', profitMultiplier)
      } else {
        console.warn('⚠️ No Profit Multiplier data returned')
      }

      // Process correct score predictions
      if (correctScoreResult.data) {
        console.log('✅ Processing Correct Score Predictions:', correctScoreResult.data.length, 'items')
        correctScoreResult.data.forEach((pred: any) => {
          // For correct_score predictions in the main predictions table,
          // the score is stored in prediction_type (see insert-predictions route)
          const score = (pred as any).prediction_type || (pred as any).score_prediction || '0-0'

          correctScore.push({
            id: pred.id,
            home_team: pred.home_team,
            away_team: pred.away_team,
            league: pred.league,
            score_prediction: score,
            odds: Number(pred.odds) || 0,
            // Preserve confidence from the predictions table so we can display it on the home page
            confidence: (pred as any).confidence ?? undefined,
            kickoff_time: pred.kickoff_time,
            status: (pred as any).status || 'not_started',
            type: 'correct_score'
          })
        })
        console.log('📦 Processed Correct Score:', correctScore)
      } else {
        console.warn('⚠️ No Correct Score data returned')
      }

      // Sort by kickoff time
      profitMultiplier.sort((a, b) =>
        new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
      )
      correctScore.sort((a, b) =>
        new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
      )

      // Take first 2 of each for display
      const displayProfitMultiplier = profitMultiplier.slice(0, 2)
      const displayCorrectScore = correctScore.slice(0, 2)

      console.log('🎯 Premium Predictions - Final Display Data:', {
        profitMultiplier: {
          total: profitMultiplier.length,
          display: displayProfitMultiplier.length,
          items: displayProfitMultiplier
        },
        correctScore: {
          total: correctScore.length,
          display: displayCorrectScore.length,
          items: displayCorrectScore
        }
      })

      // Fetch team logos and match scores for all predictions
      const allPredictions = [...displayProfitMultiplier, ...displayCorrectScore]
      if (allPredictions.length > 0) {
        const predictionsByDate = new Map<string, PremiumPrediction[]>()
        allPredictions.forEach((pred) => {
          const kickoffDate = new Date(pred.kickoff_time).toISOString().split('T')[0]
          if (!predictionsByDate.has(kickoffDate)) {
            predictionsByDate.set(kickoffDate, [])
          }
          predictionsByDate.get(kickoffDate)!.push(pred)
        })

        try {
          const newLogos: Record<string, string | null> = {}
          const updatedProfitMultiplier = [...displayProfitMultiplier]
          const updatedCorrectScore = [...displayCorrectScore]

          // Fetch fixtures for each date
          const fixturePromises = Array.from(predictionsByDate.keys()).map(async (date) => {
            try {
              const response = await fetch(`/api/football/fixtures?from=${date}&to=${date}`)
              if (!response.ok) return { date, fixtures: [] }

              const fixturesData = await response.json()
              const fixtures = Array.isArray(fixturesData) ? fixturesData : (Array.isArray(fixturesData?.data) ? fixturesData.data : [])
              return { date, fixtures }
            } catch (err) {
              console.error(`Error fetching fixtures for date ${date}:`, err)
              return { date, fixtures: [] }
            }
          })

          const fixtureResults = await Promise.all(fixturePromises)
          const fixturesByDate = new Map<string, any[]>()
          fixtureResults.forEach(({ date, fixtures }) => {
            fixturesByDate.set(date, fixtures)
          })

          // Process each date's predictions
          for (const [date, datePredictions] of predictionsByDate.entries()) {
            const fixtures = fixturesByDate.get(date) || []

            datePredictions.forEach((pred) => {
              const fixture = fixtures.find((f: any) => {
                const homeMatch = f.match_hometeam_name?.toLowerCase() === pred.home_team.toLowerCase() ||
                  f.match_hometeam_name?.toLowerCase().includes(pred.home_team.toLowerCase()) ||
                  pred.home_team.toLowerCase().includes(f.match_hometeam_name?.toLowerCase() || '')

                const awayMatch = f.match_awayteam_name?.toLowerCase() === pred.away_team.toLowerCase() ||
                  f.match_awayteam_name?.toLowerCase().includes(pred.away_team.toLowerCase()) ||
                  pred.away_team.toLowerCase().includes(f.match_awayteam_name?.toLowerCase() || '')

                return homeMatch && awayMatch
              })

              if (fixture) {
                // Update logos
                if (fixture.team_home_badge) {
                  newLogos[pred.home_team] = fixture.team_home_badge
                }
                if (fixture.team_away_badge) {
                  newLogos[pred.away_team] = fixture.team_away_badge
                }

                // Update match scores if finished
                // Check for finished status and valid scores (not null, undefined, or empty string)
                const homeScore = fixture.match_hometeam_score
                const awayScore = fixture.match_awayteam_score
                const isFinished = fixture.match_status === 'Finished' || fixture.match_status === 'FT' || fixture.match_status === 'FT_PEN'
                const hasValidScores = homeScore !== null && homeScore !== undefined && homeScore !== '' &&
                  awayScore !== null && awayScore !== undefined && awayScore !== ''

                if (isFinished && hasValidScores) {
                  const predIndex = pred.type === 'profit_multiplier'
                    ? updatedProfitMultiplier.findIndex(p => p.id === pred.id)
                    : updatedCorrectScore.findIndex(p => p.id === pred.id)

                  if (predIndex !== -1) {
                    if (pred.type === 'profit_multiplier') {
                      // Only update scores, preserve prediction_type
                      updatedProfitMultiplier[predIndex] = {
                        ...updatedProfitMultiplier[predIndex],
                        home_score: String(homeScore).trim(),
                        away_score: String(awayScore).trim()
                      }
                    } else {
                      // Only update scores, preserve score_prediction
                      updatedCorrectScore[predIndex] = {
                        ...updatedCorrectScore[predIndex],
                        home_score: String(homeScore).trim(),
                        away_score: String(awayScore).trim()
                      }
                    }
                  }
                }
              }
            })
          }

          if (Object.keys(newLogos).length > 0) {
            setTeamLogos((latestLogos) => ({ ...latestLogos, ...newLogos }))
          }

          // Update predictions with scores
          console.log('🎨 Premium Predictions - Final State After Logo/Score Fetch:', {
            profitMultiplier: updatedProfitMultiplier,
            correctScore: updatedCorrectScore,
            logos: Object.keys(newLogos).length
          })
          setProfitMultiplierPredictions(updatedProfitMultiplier)
          setCorrectScorePredictions(updatedCorrectScore)
        } catch (error) {
          console.error('❌ Error fetching team logos and scores:', error)
          // Still set predictions even if logo fetch fails
          setProfitMultiplierPredictions(displayProfitMultiplier)
          setCorrectScorePredictions(displayCorrectScore)
        }
      } else {
        console.log('⚠️ Premium Predictions - No predictions to display, setting empty arrays')
        setProfitMultiplierPredictions([])
        setCorrectScorePredictions([])
      }

      console.log('✅ Premium Predictions - Fetch Complete:', {
        profitMultiplierCount: profitMultiplier.length,
        correctScoreCount: correctScore.length,
        displayProfitMultiplierCount: displayProfitMultiplier.length,
        displayCorrectScoreCount: displayCorrectScore.length
      })

      setLoading(false)
    }

    fetchData()
  }, [profitMultiplierDateType, profitMultiplierCustomDate, profitMultiplierDaysBack, correctScoreDateType, correctScoreCustomDate, correctScoreDaysBack])

  const handleSubscribe = () => {
    if (!user) {
      router.push('/login')
    } else {
      router.push('/subscriptions')
    }
  }

  // Check if a prediction is in the past (kickoff time has passed)
  const isPastGame = (kickoffTime: string): boolean => {
    const kickoff = new Date(kickoffTime)
    const now = new Date()
    // Compare dates (ignore time for "past" check - if kickoff date is before today, it's past)
    const kickoffDate = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return kickoffDate < today
  }

  // Check if a prediction is for today or future
  const shouldShowLocks = (kickoffTime: string): boolean => {
    return !isPastGame(kickoffTime)
  }

  const getTeamLogo = (teamName: string): string | null => {
    return teamLogos[teamName] || null
  }

  return (
    <section className="py-8 lg:py-16 bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="container mx-auto px-4">
        <div className="mb-4 lg:mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent mb-1 lg:mb-2">
              Premium Predictions
            </h2>
            <p className="text-sm lg:text-base text-gray-300">Exclusive high-value predictions - Subscribe to unlock</p>
          </div>
        </div>

        {loading ? (
          <>
            {/* Profit Multiplier Loading */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">Profit Multiplier</h3>
                <div className="flex gap-1 bg-gray-800 border border-yellow-600/30 p-1 rounded-lg">
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-20" />
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-16" />
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-20" />
                </div>
              </div>

              {/* Mobile Loading State */}
              <div className="lg:hidden space-y-3 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-16 bg-gray-700 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-gray-700 rounded" />
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-gray-700 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-gray-700 rounded" />
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                      <div className="text-center">Status</div>
                      <div className="text-center">Tip</div>
                      <div className="text-center">Score</div>
                      <div className="text-center">Odd</div>
                      <div className="text-center">Conf</div>
                    </div>
                    <div className="bg-gray-900 border border-yellow-600/20 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center">
                      <div className="h-4 w-12 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-8 w-8 bg-gray-700 rounded-full mx-auto" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Loading State */}
              <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                  <div className="col-span-2 lg:col-span-2">Time & League</div>
                  <div className="col-span-4">Teams</div>
                  <div className="col-span-1 text-center hidden sm:block">Score</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-center">Tip</div>
                  <div className="col-span-1 text-center hidden md:block">Odd</div>
                  <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                </div>
                {[1, 2].map((i) => (
                  <div key={i} className={cn(
                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-yellow-600/20 bg-gray-800 animate-pulse",
                    i === 2 && 'border-b-0',
                    i % 2 === 0 && 'bg-gray-900/50'
                  )}>
                    <div className="col-span-2 lg:col-span-2">
                      <div className="h-4 w-16 bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="col-span-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                        <div className="h-4 w-32 bg-gray-700 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                        <div className="h-4 w-32 bg-gray-700 rounded" />
                      </div>
                    </div>
                    <div className="col-span-1 text-center hidden sm:block">
                      <div className="h-4 w-8 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="h-6 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="h-5 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center hidden md:block">
                      <div className="h-5 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-2 flex justify-center hidden lg:flex">
                      <div className="h-12 w-12 bg-gray-700 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Correct Score Loading */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">Correct Score Predictions</h3>
                <div className="flex gap-1 bg-gray-800 border border-yellow-600/30 p-1 rounded-lg">
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-20" />
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-16" />
                  <div className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium bg-gray-700 animate-pulse h-8 w-20" />
                </div>
              </div>

              {/* Mobile Loading State */}
              <div className="lg:hidden space-y-3 mb-6">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="h-4 w-16 bg-gray-700 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-gray-700 rounded" />
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="h-3 w-20 bg-gray-700 rounded" />
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-24 bg-gray-700 rounded" />
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                      <div className="text-center">Status</div>
                      <div className="text-center">Tip</div>
                      <div className="text-center">Score</div>
                      <div className="text-center">Odd</div>
                      <div className="text-center">Conf</div>
                    </div>
                    <div className="bg-gray-900 border border-yellow-600/20 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center">
                      <div className="h-4 w-12 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-4 w-10 bg-gray-700 rounded mx-auto" />
                      <div className="h-8 w-8 bg-gray-700 rounded-full mx-auto" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Loading State */}
              <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                  <div className="col-span-2 lg:col-span-2">Time & League</div>
                  <div className="col-span-4">Teams</div>
                  <div className="col-span-1 text-center hidden sm:block">Score</div>
                  <div className="col-span-1 text-center">Status</div>
                  <div className="col-span-1 text-center">Tip</div>
                  <div className="col-span-1 text-center hidden md:block">Odd</div>
                  <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                </div>
                {[1, 2].map((i) => (
                  <div key={i} className={cn(
                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-yellow-600/20 bg-gray-800 animate-pulse",
                    i === 2 && 'border-b-0',
                    i % 2 === 0 && 'bg-gray-900/50'
                  )}>
                    <div className="col-span-2 lg:col-span-2">
                      <div className="h-4 w-16 bg-gray-700 rounded" />
                      <div className="h-3 w-24 bg-gray-700 rounded mt-1" />
                    </div>
                    <div className="col-span-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                        <div className="h-4 w-32 bg-gray-700 rounded" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 bg-gray-700 rounded-full" />
                        <div className="h-4 w-32 bg-gray-700 rounded" />
                      </div>
                    </div>
                    <div className="col-span-1 text-center hidden sm:block">
                      <div className="h-4 w-8 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="h-6 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="h-5 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-1 text-center hidden md:block">
                      <div className="h-5 w-12 bg-gray-700 rounded mx-auto" />
                    </div>
                    <div className="col-span-2 flex justify-center hidden lg:flex">
                      <div className="h-12 w-12 bg-gray-700 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Profit Multiplier Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">Profit Multiplier</h3>
                <div className="flex gap-1 bg-gray-800 border border-yellow-600/30 p-1 rounded-lg">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left font-normal bg-gray-800 border-gray-700 text-gray-400 hover:text-yellow-400 hover:bg-gray-700",
                          (profitMultiplierCustomDate || profitMultiplierDateType === 'custom') && "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50 border-yellow-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {profitMultiplierCustomDate ? format(new Date(profitMultiplierCustomDate), 'MMM dd') : 'Select Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-yellow-600/30" align="start">
                      <Calendar
                        mode="single"
                        selected={profitMultiplierCustomDate ? new Date(profitMultiplierCustomDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setProfitMultiplierCustomDate(format(date, 'yyyy-MM-dd'))
                            setProfitMultiplierDateType('custom')
                            setProfitMultiplierDaysBack(0)
                          }
                        }}
                        initialFocus
                        className="bg-gray-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => {
                      setProfitMultiplierDateType('today')
                      setProfitMultiplierCustomDate('')
                      setProfitMultiplierDaysBack(0)
                    }}
                    className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${profitMultiplierDateType === 'today'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                      }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setProfitMultiplierDateType('tomorrow')
                      setProfitMultiplierCustomDate('')
                      setProfitMultiplierDaysBack(0)
                    }}
                    className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${profitMultiplierDateType === 'tomorrow'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                      }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {profitMultiplierPredictions.length > 0 ? (
                <>
                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3 mb-6">
                    {profitMultiplierPredictions.map((prediction) => (
                      <div
                        key={prediction.id}
                        onClick={handleSubscribe}
                        className="bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2 cursor-pointer hover:bg-gray-700 hover:border-yellow-500/50 transition-all shadow-lg shadow-black/50"
                      >
                        {/* Top Row: Time and Home Team */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-yellow-400">
                            {formatTime(prediction.kickoff_time)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{prediction.home_team}</span>
                            {getTeamLogo(prediction.home_team) ? (
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image
                                  src={getTeamLogo(prediction.home_team)!}
                                  alt={prediction.home_team}
                                  width={24}
                                  height={24}
                                  className="object-contain rounded-full"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                {prediction.home_team.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Second Row: League and Away Team */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{prediction.league}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{prediction.away_team}</span>
                            {getTeamLogo(prediction.away_team) ? (
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image
                                  src={getTeamLogo(prediction.away_team)!}
                                  alt={prediction.away_team}
                                  width={24}
                                  height={24}
                                  className="object-contain rounded-full"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                {prediction.away_team.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Header Bar */}
                        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                          <div className="text-center">Status</div>
                          <div className="text-center">Tip</div>
                          <div className="text-center">Score</div>
                          <div className="text-center">Odd</div>
                          <div className="text-center">Conf</div>
                        </div>

                        {/* Prediction Row */}
                        <div
                          onClick={shouldShowLocks(prediction.kickoff_time) ? handleSubscribe : undefined}
                          className={cn(
                            "bg-gray-900 border border-yellow-600/20 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center transition-all",
                            shouldShowLocks(prediction.kickoff_time) && "cursor-pointer hover:bg-gray-800 hover:border-yellow-500/40"
                          )}
                        >
                          <div className="flex items-center justify-center">
                            <Badge
                              variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                              className="text-[10px] px-1.5 py-0.5 text-white"
                            >
                              {prediction.status === 'finished' ? 'FT' : prediction.status === 'live' ? 'Live' : 'NS'}
                            </Badge>
                          </div>
                          <div className="text-[10px] sm:text-xs font-medium text-gray-400 text-center truncate flex items-center justify-center gap-1">
                            {shouldShowLocks(prediction.kickoff_time) ? (
                              <Lock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <span className="text-yellow-400">{prediction.prediction_type || '-'}</span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-400 text-center">
                            {prediction.status === 'finished' && prediction.home_score && prediction.away_score
                              ? `${prediction.home_score}-${prediction.away_score}`
                              : '-'}
                          </div>
                          <div className="text-[10px] sm:text-xs font-semibold text-gray-400 text-center flex items-center justify-center gap-1">
                            {shouldShowLocks(prediction.kickoff_time) ? (
                              <Lock className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <span className="text-yellow-400">{prediction.odds?.toFixed(2) || '-'}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-center">
                            {prediction.confidence ? (
                              <CircularProgress value={prediction.confidence} size={40} strokeWidth={3} />
                            ) : (
                              shouldShowLocks(prediction.kickoff_time) ? (
                                <Lock className="h-4 w-4 text-[#f97316]" />
                              ) : null
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                      <div className="col-span-2 lg:col-span-2">Time & League</div>
                      <div className="col-span-4">Teams</div>
                      <div className="col-span-1 text-center hidden sm:block">Score</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-center">Tip</div>
                      <div className="col-span-1 text-center hidden md:block">Odd</div>
                      <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                    </div>

                    {/* Predictions */}
                    {profitMultiplierPredictions.map((prediction, index) => {
                      const showLocks = shouldShowLocks(prediction.kickoff_time)
                      return (
                        <div
                          key={prediction.id}
                          onClick={showLocks ? handleSubscribe : undefined}
                          className={cn(
                            'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-yellow-600/20 bg-gray-800 transition-all duration-300 transform',
                            index === profitMultiplierPredictions.length - 1 && 'border-b-0',
                            index % 2 === 0 && 'bg-gray-900/50',
                            showLocks && 'hover:bg-gray-700 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/10 cursor-pointer hover:scale-[1.01] hover:border-l-4 hover:border-l-yellow-500'
                          )}
                        >
                          {/* Time & League */}
                          <div className="col-span-2 lg:col-span-2">
                            <div className="text-xs sm:text-sm font-medium text-yellow-400">
                              {formatTime(prediction.kickoff_time)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 lg:mt-1 truncate">{prediction.league}</div>
                          </div>

                          {/* Teams */}
                          <div className="col-span-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {getTeamLogo(prediction.home_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.home_team)!}
                                    alt={prediction.home_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700 border border-yellow-600/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                                  {prediction.home_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-white truncate">
                                {prediction.home_team}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getTeamLogo(prediction.away_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.away_team)!}
                                    alt={prediction.away_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700 border border-yellow-600/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                                  {prediction.away_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-white truncate">
                                {prediction.away_team}
                              </span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="col-span-1 text-center hidden sm:block">
                            <span className="text-sm font-semibold text-gray-400">
                              {prediction.status === 'finished' && prediction.home_score && prediction.away_score
                                ? `${prediction.home_score}-${prediction.away_score}`
                                : '-'}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="col-span-1 text-center">
                            <Badge
                              variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                              className="text-xs text-white"
                            >
                              {prediction.status === 'finished' ? 'FT' : prediction.status === 'live' ? 'Live' : 'NS'}
                            </Badge>
                          </div>

                          {/* Tip with Lock or Value */}
                          <div className="col-span-1 text-center">
                            {showLocks ? (
                              <Lock className="h-5 w-5 text-yellow-500 mx-auto" />
                            ) : (
                              <span className="text-sm font-semibold text-yellow-400">{prediction.prediction_type || '-'}</span>
                            )}
                          </div>

                          {/* Odd with Lock or Value */}
                          <div className="col-span-1 text-center hidden md:block">
                            {showLocks ? (
                              <Lock className="h-5 w-5 text-yellow-500 mx-auto" />
                            ) : (
                              <span className="text-sm font-semibold text-yellow-400">{prediction.odds?.toFixed(2) || '-'}</span>
                            )}
                          </div>

                          {/* Confidence */}
                          <div className="col-span-2 flex justify-center hidden lg:flex">
                            {prediction.confidence ? (
                              <CircularProgress value={prediction.confidence} size={50} strokeWidth={5} />
                            ) : (
                              showLocks && <Lock className="h-5 w-5 text-[#f97316]" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Mobile Empty State */}
                  <div className="lg:hidden space-y-3 mb-6">
                    <div className="bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2">
                      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                        <div className="text-center">Status</div>
                        <div className="text-center">Tip</div>
                        <div className="text-center">Score</div>
                        <div className="text-center">Odd</div>
                        <div className="text-center">Conf</div>
                      </div>
                      <div className="bg-gray-900 border border-yellow-600/20 px-2 py-8 rounded text-center">
                        <p className="text-gray-400 text-sm">No predictions available for this date</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Empty State */}
                  <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                    <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                      <div className="col-span-2 lg:col-span-2">Time & League</div>
                      <div className="col-span-4">Teams</div>
                      <div className="col-span-1 text-center hidden sm:block">Score</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-center">Tip</div>
                      <div className="col-span-1 text-center hidden md:block">Odd</div>
                      <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                    </div>
                    <div className="px-6 py-12 text-center bg-gray-800">
                      <p className="text-gray-400">No predictions available for this date</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Correct Score Predictions Section */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-yellow-400">Correct Score Predictions</h3>
                <div className="flex gap-1 bg-gray-800 border border-yellow-600/30 p-1 rounded-lg">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left font-normal bg-gray-800 border-gray-700 text-gray-400 hover:text-yellow-400 hover:bg-gray-700",
                          (correctScoreCustomDate || correctScoreDateType === 'custom') && "bg-yellow-500 text-black shadow-lg shadow-yellow-500/50 border-yellow-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {correctScoreCustomDate ? format(new Date(correctScoreCustomDate), 'MMM dd') : 'Select Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-gray-800 border-yellow-600/30" align="start">
                      <Calendar
                        mode="single"
                        selected={correctScoreCustomDate ? new Date(correctScoreCustomDate) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setCorrectScoreCustomDate(format(date, 'yyyy-MM-dd'))
                            setCorrectScoreDateType('custom')
                            setCorrectScoreDaysBack(0)
                          }
                        }}
                        initialFocus
                        className="bg-gray-800 text-white"
                      />
                    </PopoverContent>
                  </Popover>
                  <button
                    onClick={() => {
                      setCorrectScoreDateType('today')
                      setCorrectScoreCustomDate('')
                      setCorrectScoreDaysBack(0)
                    }}
                    className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${correctScoreDateType === 'today'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                      }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      setCorrectScoreDateType('tomorrow')
                      setCorrectScoreCustomDate('')
                      setCorrectScoreDaysBack(0)
                    }}
                    className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${correctScoreDateType === 'tomorrow'
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                        : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'
                      }`}
                  >
                    Tomorrow
                  </button>
                </div>
              </div>

              {correctScorePredictions.length > 0 ? (
                <>
                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3 mb-6">
                    {correctScorePredictions.map((prediction) => {
                      const showLocks = shouldShowLocks(prediction.kickoff_time)
                      return (
                        <div
                          key={prediction.id}
                          onClick={showLocks ? handleSubscribe : undefined}
                          className={cn(
                            "bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2 transition-all shadow-lg shadow-black/50",
                            showLocks && "cursor-pointer hover:bg-gray-700 hover:border-yellow-500/50"
                          )}
                        >
                          {/* Top Row: Time and Home Team */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-yellow-400">
                              {formatTime(prediction.kickoff_time)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{prediction.home_team}</span>
                              {getTeamLogo(prediction.home_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.home_team)!}
                                    alt={prediction.home_team}
                                    width={24}
                                    height={24}
                                    className="object-contain rounded-full"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                  {prediction.home_team.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Second Row: League and Away Team */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400">{prediction.league}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{prediction.away_team}</span>
                              {getTeamLogo(prediction.away_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.away_team)!}
                                    alt={prediction.away_team}
                                    width={24}
                                    height={24}
                                    className="object-contain rounded-full"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                  {prediction.away_team.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Header Bar */}
                          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                            <div className="text-center">Status</div>
                            <div className="text-center">Tip</div>
                            <div className="text-center">Score</div>
                            <div className="text-center">Odd</div>
                            <div className="text-center">Conf</div>
                          </div>

                          {/* Prediction Row */}
                          <div
                            onClick={showLocks ? handleSubscribe : undefined}
                            className={cn(
                              "bg-gray-900 border border-yellow-600/20 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center transition-all",
                              showLocks && "cursor-pointer hover:bg-gray-800 hover:border-yellow-500/40"
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <Badge
                                variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                                className="text-[10px] px-1.5 py-0.5 text-white"
                              >
                                {prediction.status === 'finished' ? 'FT' : prediction.status === 'live' ? 'Live' : 'NS'}
                              </Badge>
                            </div>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-400 text-center truncate flex items-center justify-center gap-1">
                              {showLocks ? (
                                <Lock className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <span className="text-yellow-400">{prediction.score_prediction || '-'}</span>
                              )}
                            </div>
                            <div className="text-[10px] sm:text-xs font-semibold text-gray-400 text-center">
                              {prediction.status === 'finished' && prediction.home_score && prediction.away_score
                                ? `${prediction.home_score}-${prediction.away_score}`
                                : '-'}
                            </div>
                            <div className="text-[10px] sm:text-xs font-semibold text-gray-400 text-center flex items-center justify-center gap-1">
                              {showLocks ? (
                                <Lock className="h-4 w-4 text-yellow-500" />
                              ) : (
                                <span className="text-yellow-400">{prediction.odds?.toFixed(2) || '-'}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-center">
                              {prediction.confidence ? (
                                <CircularProgress value={prediction.confidence} size={40} strokeWidth={3} />
                              ) : (
                                <span className="text-[10px] sm:text-xs text-gray-400">-</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                      <div className="col-span-2 lg:col-span-2">Time & League</div>
                      <div className="col-span-4">Teams</div>
                      <div className="col-span-1 text-center hidden sm:block">Score</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-center">Tip</div>
                      <div className="col-span-1 text-center hidden md:block">Odd</div>
                      <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                    </div>

                    {/* Predictions */}
                    {correctScorePredictions.map((prediction, index) => {
                      const showLocks = shouldShowLocks(prediction.kickoff_time)
                      return (
                        <div
                          key={prediction.id}
                          onClick={showLocks ? handleSubscribe : undefined}
                          className={cn(
                            'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-yellow-600/20 bg-gray-800 transition-all duration-300 transform',
                            index === correctScorePredictions.length - 1 && 'border-b-0',
                            index % 2 === 0 && 'bg-gray-900/50',
                            showLocks && 'hover:bg-gray-700 hover:border-yellow-500/40 hover:shadow-lg hover:shadow-yellow-500/10 cursor-pointer hover:scale-[1.01] hover:border-l-4 hover:border-l-yellow-500'
                          )}
                        >
                          {/* Time & League */}
                          <div className="col-span-2 lg:col-span-2">
                            <div className="text-xs sm:text-sm font-medium text-yellow-400">
                              {formatTime(prediction.kickoff_time)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 lg:mt-1 truncate">{prediction.league}</div>
                          </div>

                          {/* Teams */}
                          <div className="col-span-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {getTeamLogo(prediction.home_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.home_team)!}
                                    alt={prediction.home_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700 border border-yellow-600/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                                  {prediction.home_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-white truncate">
                                {prediction.home_team}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getTeamLogo(prediction.away_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(prediction.away_team)!}
                                    alt={prediction.away_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-700 border border-yellow-600/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                                  {prediction.away_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-white truncate">
                                {prediction.away_team}
                              </span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="col-span-1 text-center hidden sm:block">
                            <span className="text-sm font-semibold text-gray-400">-</span>
                          </div>

                          {/* Status */}
                          <div className="col-span-1 text-center">
                            <Badge
                              variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                              className="text-xs text-white"
                            >
                              {prediction.status === 'finished' ? 'FT' : prediction.status === 'live' ? 'Live' : 'NS'}
                            </Badge>
                          </div>

                          {/* Tip with Lock or Value */}
                          <div className="col-span-1 text-center">
                            {showLocks ? (
                              <Lock className="h-5 w-5 text-yellow-500 mx-auto" />
                            ) : (
                              <span className="text-sm font-semibold text-yellow-400">{prediction.score_prediction || '-'}</span>
                            )}
                          </div>

                          {/* Odd with Lock or Value */}
                          <div className="col-span-1 text-center hidden md:block">
                            {showLocks ? (
                              <Lock className="h-5 w-5 text-yellow-500 mx-auto" />
                            ) : (
                              <span className="text-sm font-semibold text-yellow-400">{prediction.odds?.toFixed(2) || '-'}</span>
                            )}
                          </div>

                          {/* Confidence */}
                          <div className="col-span-2 flex justify-center hidden lg:flex">
                            {prediction.confidence ? (
                              <CircularProgress value={prediction.confidence} size={50} strokeWidth={5} />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Mobile Empty State */}
                  <div className="lg:hidden space-y-3 mb-6">
                    <div className="bg-gray-800 border border-yellow-600/30 rounded-lg p-3 space-y-2">
                      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold shadow-lg">
                        <div className="text-center">Status</div>
                        <div className="text-center">Tip</div>
                        <div className="text-center">Score</div>
                        <div className="text-center">Odd</div>
                        <div className="text-center">Conf</div>
                      </div>
                      <div className="bg-gray-900 border border-yellow-600/20 px-2 py-8 rounded text-center">
                        <p className="text-gray-400 text-sm">No predictions available for this date</p>
                      </div>
                    </div>
                  </div>

                  {/* Desktop Empty State */}
                  <div className="hidden lg:block space-y-0 border-2 border-yellow-600/40 rounded-xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 mb-6">
                    <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-black px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-lg">
                      <div className="col-span-2 lg:col-span-2">Time & League</div>
                      <div className="col-span-4">Teams</div>
                      <div className="col-span-1 text-center hidden sm:block">Score</div>
                      <div className="col-span-1 text-center">Status</div>
                      <div className="col-span-1 text-center">Tip</div>
                      <div className="col-span-1 text-center hidden md:block">Odd</div>
                      <div className="col-span-2 text-center hidden lg:block">Confidence</div>
                    </div>
                    <div className="px-6 py-12 text-center bg-gray-800">
                      <p className="text-gray-400">No predictions available for this date</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Subscribe CTA */}
            <div className="mt-6 text-center">
              <Button
                onClick={handleSubscribe}
                className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold px-8 py-3 rounded-lg text-lg shadow-lg shadow-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/70 transition-all duration-300 transform hover:scale-105 border border-yellow-300"
              >
                Subscribe to Unlock
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

