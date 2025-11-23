'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock } from 'lucide-react'
import { Prediction, CorrectScorePrediction, UserSubscriptionWithPlan, Plan } from '@/types'
import { formatTime, getDateRange } from '@/lib/utils/date'
import { toast } from 'sonner'
import { CircularProgress } from '@/components/ui/circular-progress'
import { cn } from '@/lib/utils'

interface PredictionsListProps {
  allPlans: Plan[]
  subscriptions: UserSubscriptionWithPlan[]
}

interface TeamLogoCache {
  [key: string]: string | null // team_name -> logo_url
}

export function PredictionsList({ allPlans, subscriptions }: PredictionsListProps) {
  const router = useRouter()
  const [selectedPlanSlug, setSelectedPlanSlug] = useState<string>('')
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow'>('today')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [correctScorePredictions, setCorrectScorePredictions] = useState<CorrectScorePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [teamLogos, setTeamLogos] = useState<TeamLogoCache>({})

  // Initialize with first plan if available
  useEffect(() => {
    if (allPlans.length > 0 && !selectedPlanSlug) {
      setSelectedPlanSlug(allPlans[0].slug)
    }
  }, [allPlans, selectedPlanSlug])

  // Check if plan is unlocked (user has active subscription)
  const isPlanUnlocked = (planId: string): boolean => {
    const subscription = subscriptions.find((s) => s.plan_id === planId)
    return subscription?.plan_status === 'active'
  }

  // Fetch team logos for predictions using fixtures API (same as home page)
  const fetchTeamLogos = async (predictions: (Prediction | CorrectScorePrediction)[]) => {
    if (predictions.length === 0) return

    // Group predictions by date to minimize API calls
    const predictionsByDate = new Map<string, (Prediction | CorrectScorePrediction)[]>()
    
    predictions.forEach((pred) => {
      const kickoffDate = new Date(pred.kickoff_time).toISOString().split('T')[0]
      if (!predictionsByDate.has(kickoffDate)) {
        predictionsByDate.set(kickoffDate, [])
      }
      predictionsByDate.get(kickoffDate)!.push(pred)
    })

    console.log('🖼️ Fetching logos from fixtures for', predictionsByDate.size, 'date(s)')

    try {
      const newLogos: TeamLogoCache = {}
      
      // Fetch fixtures for each date
      for (const [date, datePredictions] of predictionsByDate.entries()) {
        try {
          // Fetch fixtures for this date
          const response = await fetch(`/api/football/fixtures?from=${date}&to=${date}`)
          if (!response.ok) continue
          
          const fixturesData = await response.json()
          // Handle both array and object responses
          const fixtures = Array.isArray(fixturesData) ? fixturesData : (Array.isArray(fixturesData?.data) ? fixturesData.data : [])
          
          // Match predictions to fixtures by team names
          datePredictions.forEach((pred) => {
            // Find matching fixture by team names
            const fixture = fixtures.find((f: any) => {
              const homeMatch = f.match_hometeam_name?.toLowerCase() === pred.home_team.toLowerCase() ||
                               f.match_hometeam_name?.toLowerCase().includes(pred.home_team.toLowerCase()) ||
                               pred.home_team.toLowerCase().includes(f.match_hometeam_name?.toLowerCase() || '')
              
              const awayMatch = f.match_awayteam_name?.toLowerCase() === pred.away_team.toLowerCase() ||
                               f.match_awayteam_name?.toLowerCase().includes(pred.away_team.toLowerCase()) ||
                               pred.away_team.toLowerCase().includes(f.match_awayteam_name?.toLowerCase() || '')
              
              return homeMatch && awayMatch
            })
            
            // Use team badges from fixture (same as home page league tables)
            if (fixture) {
              if (fixture.team_home_badge) {
                newLogos[pred.home_team] = fixture.team_home_badge
                console.log(`✅ Found logo for ${pred.home_team}: ${fixture.team_home_badge}`)
              }
              if (fixture.team_away_badge) {
                newLogos[pred.away_team] = fixture.team_away_badge
                console.log(`✅ Found logo for ${pred.away_team}: ${fixture.team_away_badge}`)
              }
            }
          })
        } catch (err) {
          console.error(`Error fetching fixtures for date ${date}:`, err)
        }
      }
      
      // Update state with new logos, merging with existing ones using functional update
      if (Object.keys(newLogos).length > 0) {
        setTeamLogos((latestLogos) => {
          const mergedLogos = { ...latestLogos, ...newLogos }
          const foundCount = Object.keys(mergedLogos).length - Object.keys(latestLogos).length
          console.log(`🖼️ Logo fetch complete. Found ${foundCount} new logos`)
          return mergedLogos
        })
      } else {
        console.log(`🖼️ Logo fetch complete. No new logos found`)
      }
    } catch (error) {
      console.error('Error fetching team logos:', error)
    }
  }

  // Fetch logos when predictions change
  useEffect(() => {
    if (predictions.length > 0) {
      fetchTeamLogos(predictions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictions])

  useEffect(() => {
    if (correctScorePredictions.length > 0) {
      fetchTeamLogos(correctScorePredictions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctScorePredictions])

  // Helper to get team logo
  const getTeamLogo = (teamName: string): string | null => {
    return teamLogos[teamName] || null
  }

  // Fetch predictions when plan or date changes
  useEffect(() => {
    if (selectedPlanSlug) {
      fetchPredictions()
    }
  }, [selectedPlanSlug, dateType])

  const fetchPredictions = async () => {
    setLoading(true)
    const supabase = createClient()
    const selectedPlan = allPlans.find((p) => p.slug === selectedPlanSlug)
    
    if (!selectedPlan) {
      setLoading(false)
      return
    }

    const { from, to } = getDateRange(dateType)
    const fromTimestamp = `${from}T00:00:00.000Z`
    const toTimestamp = `${to}T23:59:59.999Z`

    const isUnlockedForFetch = isPlanUnlocked(selectedPlan.id)

    console.log('🔍 Fetching Predictions:', {
      planSlug: selectedPlan.slug,
      planName: selectedPlan.name,
      planId: selectedPlan.id,
      dateType,
      dateRange: { from, to, fromTimestamp, toTimestamp },
      isUnlocked: isUnlockedForFetch,
      maxPredictionsPerDay: selectedPlan.max_predictions_per_day
    })

    if (selectedPlan.slug === 'correct-score') {
      // Fetch correct score predictions
      let query = supabase
        .from('correct_score_predictions')
        .select('*')
        .gte('kickoff_time', fromTimestamp)
        .lte('kickoff_time', toTimestamp)
        .order('kickoff_time', { ascending: true })

      // Limit to 3 for preview if locked
      if (!isUnlockedForFetch) {
        query = query.limit(3)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching correct score predictions:', error)
        toast.error('Failed to load correct score predictions. Please try again.')
      } else {
        console.log('✅ Correct Score Predictions Data:', data)
        console.log('📊 Total Correct Score Predictions:', data?.length || 0)
        if (data && data.length > 0) {
          console.log('📋 First Prediction Sample:', data[0])
        }
        setCorrectScorePredictions(data || [])
        setPredictions([])
      }
    } else {
      // Fetch regular predictions
      let planType: 'profit_multiplier' | 'daily_2_odds' | 'standard' = 'standard'
      
      if (selectedPlan.slug === 'profit-multiplier') planType = 'profit_multiplier'
      else if (selectedPlan.slug === 'daily-2-odds') planType = 'daily_2_odds'

      let query = supabase
        .from('predictions')
        .select('*')
        .eq('plan_type', planType)
        .gte('kickoff_time', fromTimestamp)
        .lte('kickoff_time', toTimestamp)
        .order('kickoff_time', { ascending: true })

      // Apply plan-specific filters
      if (planType === 'profit_multiplier') {
        query = query.gte('odds', 2.8).lte('odds', 4.3)
      } else if (planType === 'daily_2_odds') {
        query = query.gte('odds', 2.0)
      }

      query = query.gte('confidence', 60).lte('confidence', 100)

      // Apply daily limit if set and unlocked, or limit to 3 for preview if locked
      if (isUnlockedForFetch && selectedPlan.max_predictions_per_day) {
        query = query.limit(selectedPlan.max_predictions_per_day)
      } else if (!isUnlockedForFetch) {
        query = query.limit(3) // Preview limit for locked plans
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching predictions:', error)
      } else {
        console.log('✅ Regular Predictions Data:', data)
        console.log('📊 Total Regular Predictions:', data?.length || 0)
        console.log('🎯 Plan Type:', planType)
        console.log('📅 Date Range:', { from: fromTimestamp, to: toTimestamp })
        console.log('🔓 Is Unlocked:', isUnlockedForFetch)
        if (data && data.length > 0) {
          console.log('📋 First Prediction Sample:', data[0])
          console.log('📋 All Predictions:', JSON.stringify(data, null, 2))
        }
        setPredictions(data || [])
        setCorrectScorePredictions([])
      }
    }

    setLoading(false)
  }

  // Get selected plan details
  const selectedPlan = allPlans.find((p) => p.slug === selectedPlanSlug)
  const selectedSubscription = selectedPlan ? subscriptions.find((s) => s.plan_id === selectedPlan.id) : null
  const isUnlocked = selectedPlan ? isPlanUnlocked(selectedPlan.id) : false
  const isCorrectScorePlan = selectedPlan?.slug === 'correct-score'

  const handleSubscribe = () => {
    router.push(`/subscribe?plan=${selectedPlanSlug}`)
  }

  if (allPlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No plans available at the moment.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Plan Tabs */}
      <Tabs value={selectedPlanSlug} onValueChange={setSelectedPlanSlug}>
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-4 min-w-[600px] lg:min-w-0">
            {allPlans.map((plan) => {
              const unlocked = isPlanUnlocked(plan.id)
              return (
                <TabsTrigger 
                  key={plan.id} 
                  value={plan.slug}
                  className="relative text-xs lg:text-sm px-2 lg:px-4"
                >
                  {unlocked ? (
                    <span className="truncate">{plan.name}</span>
                  ) : (
                    <span className="flex items-center gap-1 lg:gap-2 truncate">
                      <span className="truncate">{plan.name}</span>
                      <Lock className="h-3 w-3 flex-shrink-0" />
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </div>
      </Tabs>

      {/* Plan Header and Date Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-0">
        <div>
          <h2 className="text-lg lg:text-xl font-semibold flex flex-wrap items-center gap-2">
            <span>{selectedPlan?.name}</span>
            {!isUnlocked && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Locked
              </Badge>
            )}
            {isUnlocked && (
              <Badge variant="default" className="bg-green-600 text-xs">
                Active
              </Badge>
            )}
          </h2>
          {selectedPlan?.description && (
            <p className="text-xs lg:text-sm text-muted-foreground mt-1">{selectedPlan.description}</p>
          )}
        </div>
        <div className="flex gap-1 lg:gap-2">
          <Button
            variant={dateType === 'previous' ? 'default' : 'outline'}
            size="sm"
            className="text-xs lg:text-sm px-2 lg:px-3"
            onClick={() => setDateType('previous')}
          >
            Previous
          </Button>
          <Button
            variant={dateType === 'today' ? 'default' : 'outline'}
            size="sm"
            className="text-xs lg:text-sm px-2 lg:px-3"
            onClick={() => setDateType('today')}
          >
            Today
          </Button>
          <Button
            variant={dateType === 'tomorrow' ? 'default' : 'outline'}
            size="sm"
            className="text-xs lg:text-sm px-2 lg:px-3"
            onClick={() => setDateType('tomorrow')}
          >
            Tomorrow
          </Button>
        </div>
      </div>

      {/* Predictions Display */}
      {loading ? (
        <div className="grid gap-3 lg:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="p-3 lg:p-6">
                <div className="h-3 lg:h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-2 lg:h-3 w-1/2 bg-gray-200 rounded mt-2" />
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="h-2 lg:h-3 w-full bg-gray-200 rounded mb-2" />
                <div className="h-2 lg:h-3 w-2/3 bg-gray-200 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !isUnlocked ? (
        // Locked Plan - Show Locked Predictions with CTA
        <div className="space-y-4">
          <Card className="border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="py-4 lg:py-6 text-center px-4">
              <Lock className="mx-auto mb-3 lg:mb-4 h-8 w-8 lg:h-12 lg:w-12 text-yellow-600" />
              <h3 className="text-base lg:text-lg font-semibold mb-2">Premium Content Locked</h3>
              <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">
                Subscribe to {selectedPlan?.name} to unlock all predictions and access premium features.
              </p>
              <Button onClick={handleSubscribe} size="sm" className="lg:size-lg text-xs lg:text-base">
                Subscribe to Unlock
              </Button>
            </CardContent>
          </Card>

          {/* Locked Preview Cards */}
          {isCorrectScorePlan ? (
            correctScorePredictions.length > 0 ? (
              <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {correctScorePredictions.map((prediction) => {
                  const homeLogo = getTeamLogo(prediction.home_team)
                  const awayLogo = getTeamLogo(prediction.away_team)
                  
                  return (
                  <Card key={prediction.id} className="relative overflow-hidden border-2 border-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
                      <div className="text-center p-4">
                        <Lock className="mx-auto mb-3 h-10 w-10 text-[#f97316] animate-pulse" />
                        <Button 
                          onClick={handleSubscribe} 
                          size="sm"
                          className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-4 py-2 rounded-lg text-sm"
                        >
                          Subscribe to Premium
                        </Button>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 opacity-50">
                      <p className="text-xs font-semibold text-white text-center">{prediction.league}</p>
                    </div>
                    <CardContent className="p-6 opacity-50">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200">
                          {homeLogo ? (
                            <Image
                              src={homeLogo}
                              alt={prediction.home_team}
                                width={48}
                                height={48}
                                className="object-contain w-full h-full p-1"
                              unoptimized
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                              <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-lg lg:text-xl font-bold text-white">
                              {prediction.home_team.charAt(0)}
                            </div>
                          )}
                        </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm lg:text-base font-semibold text-gray-900 truncate">{prediction.home_team}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-gray-300"></div>
                          <span className="text-xs font-bold text-gray-500 uppercase px-2">vs</span>
                          <div className="flex-1 h-px bg-gray-300"></div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200">
                          {awayLogo ? (
                            <Image
                              src={awayLogo}
                              alt={prediction.away_team}
                                width={48}
                                height={48}
                                className="object-contain w-full h-full p-1"
                              unoptimized
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ) : (
                              <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-lg lg:text-xl font-bold text-white">
                              {prediction.away_team.charAt(0)}
                            </div>
                          )}
                        </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm lg:text-base font-semibold text-gray-900 truncate">{prediction.away_team}</p>
                      </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-xs font-semibold text-gray-700">Predicted Score</span>
                          <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1">
                            {prediction.score_prediction}
                          </Badge>
                        </div>
                        {prediction.odds && (
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            <span className="text-xs font-medium text-gray-700">Odds</span>
                            <span className="text-sm font-bold text-blue-700">{prediction.odds}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>⏰ {formatTime(prediction.kickoff_time)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}
              </div>
            ) : null
          ) : predictions.length > 0 ? (
            <div className="grid gap-4 lg:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {predictions.map((prediction) => {
                const homeLogo = getTeamLogo(prediction.home_team)
                const awayLogo = getTeamLogo(prediction.away_team)
                
                return (
                <Card key={prediction.id} className="relative overflow-hidden border-2 border-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-10 rounded-lg">
                    <div className="text-center p-4">
                      <Lock className="mx-auto mb-3 h-10 w-10 text-[#f97316] animate-pulse" />
                      <Button 
                        onClick={handleSubscribe} 
                        className="bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white font-bold px-6 py-2 rounded-lg"
                      >
                        Subscribe to Premium
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 opacity-50">
                    <p className="text-xs font-semibold text-white text-center">{prediction.league}</p>
                  </div>
                  <CardContent className="p-6 opacity-50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200">
                        {homeLogo ? (
                          <Image
                            src={homeLogo}
                            alt={prediction.home_team}
                              width={48}
                              height={48}
                              className="object-contain w-full h-full p-1"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-lg lg:text-xl font-bold text-white">
                            {prediction.home_team.charAt(0)}
                          </div>
                        )}
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm lg:text-base font-semibold text-gray-900 truncate">{prediction.home_team}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="text-xs font-bold text-gray-500 uppercase px-2">vs</span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-gray-200">
                        {awayLogo ? (
                          <Image
                            src={awayLogo}
                            alt={prediction.away_team}
                              width={48}
                              height={48}
                              className="object-contain w-full h-full p-1"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-lg lg:text-xl font-bold text-white">
                            {prediction.away_team.charAt(0)}
                          </div>
                        )}
                      </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm lg:text-base font-semibold text-gray-900 truncate">{prediction.away_team}</p>
                    </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <span className="text-xs font-semibold text-gray-700">Prediction</span>
                        <Badge className="bg-green-600 text-white font-bold text-sm px-3 py-1">
                          {prediction.prediction_type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Odds</p>
                          <p className="text-sm font-bold text-blue-700">{prediction.odds}</p>
                      </div>
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Confidence</p>
                          <p className="text-sm font-bold text-purple-700">{prediction.confidence}%</p>
                      </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t">
                        <span>⏰ {formatTime(prediction.kickoff_time)}</span>
                      </div>
                      </div>
                    </CardContent>
                </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No predictions available for this date.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : isCorrectScorePlan ? (
        // Unlocked Correct Score Plan
        correctScorePredictions.length > 0 ? (
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
          {correctScorePredictions.map((prediction) => {
            const homeLogo = getTeamLogo(prediction.home_team)
            const awayLogo = getTeamLogo(prediction.away_team)
            
            return (
                <div
                  key={prediction.id}
                  className="bg-gray-100 rounded-lg p-3 space-y-2"
                >
                  {/* Top Row: Time and Home Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formatTime(prediction.kickoff_time)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.home_team}</span>
                    {homeLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={homeLogo}
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
                    <span className="text-xs text-gray-600">{prediction.league}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.away_team}</span>
                    {awayLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={awayLogo}
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
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-3 gap-2 text-xs font-semibold">
                    <div>Score</div>
                    <div className="text-center">Odd</div>
                    <div className="text-center">Status</div>
                </div>

                  {/* Prediction Row */}
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-3 gap-2 items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {prediction.score_prediction}
                    </div>
                    <div className="text-sm font-semibold text-gray-900 text-center">
                      {prediction.odds ? prediction.odds.toFixed(2) : 'N/A'}
                    </div>
                    <div className="flex items-center justify-center">
                  <Badge
                        variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {prediction.status === 'finished' ? 'Finished' : prediction.status === 'live' ? 'Live' : 'Not Started'}
                  </Badge>
                </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-md">
              <div className="col-span-3 lg:col-span-2">Time & League</div>
              <div className="col-span-5">Teams</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-1 text-center hidden md:block">Odds</div>
              <div className="col-span-1 text-center hidden sm:block">Status</div>
            </div>

            {/* Predictions */}
            {correctScorePredictions.map((prediction, index) => {
              const homeLogo = getTeamLogo(prediction.home_team)
              const awayLogo = getTeamLogo(prediction.away_team)
              
              return (
                <div
                  key={prediction.id}
                  className={cn(
                    'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300 transform hover:scale-[1.01] hover:border-l-4 hover:border-l-[#22c55e]',
                    index === correctScorePredictions.length - 1 && 'border-b-0',
                    index % 2 === 0 && 'bg-gray-50/50'
                  )}
                >
                  {/* Time & League */}
                  <div className="col-span-3 lg:col-span-2">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatTime(prediction.kickoff_time)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 lg:mt-1 truncate">{prediction.league}</div>
                  </div>

                  {/* Teams */}
                  <div className="col-span-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {homeLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={homeLogo}
                            alt={prediction.home_team}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${prediction.home_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {prediction.home_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {prediction.home_team}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {awayLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={awayLogo}
                            alt={prediction.away_team}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${prediction.away_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {prediction.away_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {prediction.away_team}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-1 text-center">
                    <Badge variant="secondary" className="text-xs">{prediction.score_prediction}</Badge>
                  </div>

                  {/* Odds */}
                  <div className="col-span-1 text-center hidden md:block">
                    <span className="text-sm font-semibold text-gray-900">{prediction.odds ? prediction.odds.toFixed(2) : 'N/A'}</span>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-center hidden sm:block">
                    <Badge
                      variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {prediction.status === 'finished' ? 'Finished' : prediction.status === 'live' ? 'Live' : 'Not Started'}
                    </Badge>
                  </div>
                </div>
            )
          })}
        </div>
        </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No correct score predictions available for {dateType === 'previous' ? 'yesterday' : dateType === 'today' ? 'today' : 'tomorrow'}.
                Try selecting a different date.
              </p>
            </CardContent>
          </Card>
        )
      ) : predictions.length > 0 ? (
        // Unlocked Regular Predictions
        <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
          {predictions.map((prediction) => {
            const homeLogo = getTeamLogo(prediction.home_team)
            const awayLogo = getTeamLogo(prediction.away_team)
            
            return (
                <div
                  key={prediction.id}
                  className="bg-gray-100 rounded-lg p-3 space-y-2"
                >
                  {/* Top Row: Time and Home Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formatTime(prediction.kickoff_time)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.home_team}</span>
                    {homeLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={homeLogo}
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
                    <span className="text-xs text-gray-600">{prediction.league}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.away_team}</span>
                    {awayLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                      <Image
                        src={awayLogo}
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
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-3 gap-2 text-xs font-semibold">
                    <div>Tip</div>
                    <div className="text-center">Odd</div>
                    <div className="text-center">Confidence</div>
                </div>

                  {/* Prediction Row */}
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-3 gap-2 items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {prediction.prediction_type === 'Over 1.5' ? 'Ov 1.5' :
                       prediction.prediction_type === 'Over 2.5' ? 'Ov 2.5' :
                       prediction.prediction_type === 'Home Win' ? '1' :
                       prediction.prediction_type === 'Away Win' ? '2' :
                       prediction.prediction_type === 'Double Chance' ? '12' :
                       prediction.prediction_type}
                </div>
                    <div className="text-sm font-semibold text-gray-900 text-center">
                      {prediction.odds.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center">
                      <CircularProgress value={prediction.confidence} size={32} strokeWidth={4} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-md">
              <div className="col-span-3 lg:col-span-2">Time & League</div>
              <div className="col-span-5">Teams</div>
              <div className="col-span-1 text-center hidden sm:block">Status</div>
              <div className="col-span-1 text-center">Tip</div>
              <div className="col-span-1 text-center hidden md:block">Odd</div>
              <div className="col-span-2 text-center hidden lg:block">Confidence</div>
            </div>

            {/* Predictions */}
            {predictions.map((prediction, index) => {
              const homeLogo = getTeamLogo(prediction.home_team)
              const awayLogo = getTeamLogo(prediction.away_team)
              
              return (
                <div
                  key={prediction.id}
                  className={cn(
                    'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300 transform hover:scale-[1.01] hover:border-l-4 hover:border-l-[#22c55e]',
                    index === predictions.length - 1 && 'border-b-0',
                    index % 2 === 0 && 'bg-gray-50/50'
                  )}
                >
                  {/* Time & League */}
                  <div className="col-span-3 lg:col-span-2">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatTime(prediction.kickoff_time)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 lg:mt-1 truncate">{prediction.league}</div>
                  </div>

                  {/* Teams */}
                  <div className="col-span-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {homeLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={homeLogo}
                            alt={prediction.home_team}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${prediction.home_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {prediction.home_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {prediction.home_team}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {awayLogo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={awayLogo}
                            alt={prediction.away_team}
                            width={24}
                            height={24}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${prediction.away_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {prediction.away_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {prediction.away_team}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-span-1 text-center hidden sm:block">
                    <Badge
                      variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {prediction.status === 'finished' ? 'Finished' : prediction.status === 'live' ? 'Live' : 'Not Started'}
                </Badge>
                  </div>

                  {/* Tip */}
                  <div className="col-span-1 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {prediction.prediction_type === 'Over 1.5' ? 'Ov 1.5' :
                       prediction.prediction_type === 'Over 2.5' ? 'Ov 2.5' :
                       prediction.prediction_type}
                    </Badge>
                  </div>

                  {/* Odd */}
                  <div className="col-span-1 text-center hidden md:block">
                    <span className="text-sm font-semibold text-gray-900">{prediction.odds.toFixed(2)}</span>
                  </div>

                  {/* Confidence */}
                  <div className="col-span-2 flex justify-center hidden lg:flex">
                    <CircularProgress value={prediction.confidence} size={50} strokeWidth={5} />
                  </div>
                </div>
            )
          })}
        </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No predictions available for this date.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
