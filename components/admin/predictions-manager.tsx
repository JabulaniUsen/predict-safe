'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Prediction, CorrectScorePrediction, Plan } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Edit, Trash2 } from 'lucide-react'
import { CircularProgress } from '@/components/ui/circular-progress'
import { formatTime } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PredictionsManagerProps {
  plans: Plan[]
  predictions: Prediction[]
  correctScorePredictions: CorrectScorePrediction[]
}

interface TeamLogoCache {
  [key: string]: string | null // team_name -> logo_url
}

// Map plan slug to plan_type
function getPlanTypeFromSlug(slug: string): string | null {
  const mapping: Record<string, string> = {
    'profit-multiplier': 'profit_multiplier',
    'daily-2-odds': 'daily_2_odds',
    'standard': 'standard',
    'free': 'free'
  }
  return mapping[slug] || null
}

export function PredictionsManager({ plans, predictions, correctScorePredictions }: PredictionsManagerProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [predictionToDelete, setPredictionToDelete] = useState<{ id: string; type: 'regular' | 'correct-score' } | null>(null)
  const [teamLogos, setTeamLogos] = useState<TeamLogoCache>({})

  // Filter out correct-score plan from regular plans
  const regularPlans = plans.filter(plan => plan.slug !== 'correct-score')
  const correctScorePlan = plans.find(plan => plan.slug === 'correct-score')
  
  // Get default tab (first regular plan or correct-score)
  const defaultTab = regularPlans.length > 0 ? regularPlans[0].slug : 'correct-score'

  // Filter predictions by plan type for each plan
  const getPredictionsForPlan = (planSlug: string) => {
    if (planSlug === 'correct-score') {
      return correctScorePredictions
    }
    
    const planType = getPlanTypeFromSlug(planSlug)
    if (!planType) return []
    
    return predictions.filter(pred => pred.plan_type === planType)
  }

  // Fetch team logos for predictions using fixtures API (same as home page)
  const fetchTeamLogos = async (predictionsList: (Prediction | CorrectScorePrediction)[]) => {
    if (predictionsList.length === 0) return

    // Group predictions by date to minimize API calls
    const predictionsByDate = new Map<string, (Prediction | CorrectScorePrediction)[]>()
    
    predictionsList.forEach((pred) => {
      const kickoffDate = new Date(pred.kickoff_time).toISOString().split('T')[0]
      if (!predictionsByDate.has(kickoffDate)) {
        predictionsByDate.set(kickoffDate, [])
      }
      predictionsByDate.get(kickoffDate)!.push(pred)
    })

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
            
            // Use team badges from fixture
            if (fixture) {
              if (fixture.team_home_badge) {
                newLogos[pred.home_team] = fixture.team_home_badge
              }
              if (fixture.team_away_badge) {
                newLogos[pred.away_team] = fixture.team_away_badge
              }
            }
          })
        } catch (err) {
          console.error(`Error fetching fixtures for date ${date}:`, err)
        }
      }
      
      // Update state with new logos
      if (Object.keys(newLogos).length > 0) {
        setTeamLogos((latestLogos) => ({ ...latestLogos, ...newLogos }))
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

  const handleDeleteClick = (id: string, type: 'regular' | 'correct-score') => {
    setPredictionToDelete({ id, type })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!predictionToDelete) return

    setDeletingId(predictionToDelete.id)
    try {
      const supabase = createClient()
      const table = predictionToDelete.type === 'regular' ? 'predictions' : 'correct_score_predictions'
      
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', predictionToDelete.id)

      if (error) throw error

      toast.success('Prediction deleted successfully')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete prediction')
    } finally {
      setDeletingId(null)
      setDeleteDialogOpen(false)
      setPredictionToDelete(null)
    }
  }

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <div className="overflow-x-auto">
        <TabsList className="min-w-full">
          {regularPlans.map((plan) => (
            <TabsTrigger key={plan.id} value={plan.slug} className="text-xs lg:text-sm">
              {plan.name}
            </TabsTrigger>
          ))}
          {correctScorePlan && (
            <TabsTrigger value="correct-score" className="text-xs lg:text-sm">
              {correctScorePlan.name}
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      {/* Regular Plan Tabs */}
      {regularPlans.map((plan) => {
        const planPredictions = getPredictionsForPlan(plan.slug) as Prediction[]
        const isProfitMultiplier = plan.slug === 'profit-multiplier'
        const isDaily2Odds = plan.slug === 'daily-2-odds'
        const showAddWithAPI = isProfitMultiplier || isDaily2Odds
        
        return (
          <TabsContent key={plan.id} value={plan.slug} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base lg:text-lg">{plan.name} Predictions</CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                      {showAddWithAPI 
                        ? 'Add predictions using API or manually' 
                        : 'Manually add predictions for this plan'}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {showAddWithAPI && (
                      <Button asChild variant="outline" size="sm" className="text-xs lg:text-sm">
                        <Link href={`/admin/predictions/add-with-api?plan=${plan.slug}`}>
                          Add with API
                        </Link>
                      </Button>
                    )}
                    <Button asChild size="sm" className="text-xs lg:text-sm">
                      <Link href={`/admin/predictions/add?plan=${plan.slug}`}>
                        Add Manually
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {planPredictions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No predictions found for {plan.name}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                      {/* Header */}
                      <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-md">
                        <div className="col-span-3 lg:col-span-2">Time & League</div>
                        <div className="col-span-4">Teams</div>
                        <div className="col-span-1 text-center">Tip</div>
                        <div className="col-span-1 text-center hidden md:block">Odd</div>
                        <div className="col-span-1 text-center hidden lg:block">Confidence</div>
                        <div className="col-span-1 text-center hidden sm:block">Status</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>

                      {/* Predictions */}
                      {planPredictions.map((pred, index) => (
                        <div
                          key={pred.id}
                          className={cn(
                            'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300',
                            index === planPredictions.length - 1 && 'border-b-0',
                            index % 2 === 0 && 'bg-gray-50/50'
                          )}
                        >
                          {/* Time & League */}
                          <div className="col-span-3 lg:col-span-2">
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {formatTime(pred.kickoff_time)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 lg:mt-1 truncate">{pred.league}</div>
                          </div>

                          {/* Teams */}
                          <div className="col-span-4 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              {getTeamLogo(pred.home_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(pred.home_team)!}
                                    alt={pred.home_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const parent = e.currentTarget.parentElement
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${pred.home_team.charAt(0)}</div>`
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {pred.home_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {pred.home_team}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getTeamLogo(pred.away_team) ? (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                  <Image
                                    src={getTeamLogo(pred.away_team)!}
                                    alt={pred.away_team}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                    unoptimized
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      const parent = e.currentTarget.parentElement
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${pred.away_team.charAt(0)}</div>`
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {pred.away_team.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {pred.away_team}
                              </span>
                            </div>
                          </div>

                          {/* Tip */}
                          <div className="col-span-1 text-center">
                            <Badge variant="secondary" className="text-xs">
                              {pred.prediction_type === 'Over 1.5' ? 'Ov 1.5' :
                               pred.prediction_type === 'Over 2.5' ? 'Ov 2.5' :
                               pred.prediction_type}
                            </Badge>
                          </div>

                          {/* Odd */}
                          <div className="col-span-1 text-center hidden md:block">
                            <span className="text-sm font-semibold text-gray-900">{pred.odds.toFixed(2)}</span>
                          </div>

                          {/* Confidence */}
                          <div className="col-span-1 flex justify-center hidden lg:flex">
                            <CircularProgress value={pred.confidence} size={50} strokeWidth={5} />
                          </div>

                          {/* Status */}
                          <div className="col-span-1 text-center hidden sm:block">
                                <Badge
                              variant={pred.status === 'finished' ? 'default' : pred.status === 'live' ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {pred.status}
                                </Badge>
                          </div>

                          {/* Actions */}
                          <div className="col-span-1 flex items-center justify-end gap-2">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Link href={`/admin/predictions/add?plan=${plan.slug}&edit=${pred.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(pred.id, 'regular')}
                              disabled={deletingId === pred.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {planPredictions.map((pred) => {
                        const homeLogo = getTeamLogo(pred.home_team)
                        const awayLogo = getTeamLogo(pred.away_team)
                        
                        return (
                        <Card key={pred.id} className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {homeLogo ? (
                                    <div className="relative w-5 h-5 flex-shrink-0">
                                      <Image
                                        src={homeLogo}
                                        alt={pred.home_team}
                                        width={20}
                                        height={20}
                                        className="object-contain rounded-full"
                                        unoptimized
                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {pred.home_team.charAt(0)}
                                    </div>
                                  )}
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {pred.home_team}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {awayLogo ? (
                                    <div className="relative w-5 h-5 flex-shrink-0">
                                      <Image
                                        src={awayLogo}
                                        alt={pred.away_team}
                                        width={20}
                                        height={20}
                                        className="object-contain rounded-full"
                                        unoptimized
                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                      {pred.away_team.charAt(0)}
                                    </div>
                                  )}
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {pred.away_team}
                                </p>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">{pred.league}</p>
                              </div>
                              <Badge
                                variant={
                                  pred.status === 'finished'
                                    ? 'default'
                                    : pred.status === 'live'
                                    ? 'destructive'
                                    : 'outline'
                                }
                                className="text-xs ml-2 flex-shrink-0"
                              >
                                {pred.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Type:</span>
                                <Badge variant="secondary" className="text-xs">{pred.prediction_type}</Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Odds:</span>
                                <span className="text-xs font-semibold">{pred.odds}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-600">Confidence:</span>
                                <span className="text-xs font-semibold">{pred.confidence}%</span>
                              </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs"
                              >
                                <Link href={`/admin/predictions/add?plan=${plan.slug}&edit=${pred.id}`}>
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => handleDeleteClick(pred.id, 'regular')}
                                disabled={deletingId === pred.id}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </Card>
                        )
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )
      })}

      {/* Correct Score Tab */}
      {correctScorePlan && (
        <TabsContent value="correct-score" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base lg:text-lg">Correct Score Predictions</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">
                    Manually add correct score predictions
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="text-xs lg:text-sm">
                  <Link href="/admin/predictions/add-correct-score">Add Correct Score</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {correctScorePredictions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No correct score predictions found
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-md">
                      <div className="col-span-3 lg:col-span-2">Time & League</div>
                      <div className="col-span-4">Teams</div>
                      <div className="col-span-1 text-center">Score</div>
                      <div className="col-span-1 text-center hidden md:block">Odds</div>
                      <div className="col-span-1 text-center hidden sm:block">Status</div>
                      <div className="col-span-1 text-right">Actions</div>
                    </div>

                    {/* Predictions */}
                    {correctScorePredictions.map((pred, index) => (
                      <div
                        key={pred.id}
                        className={cn(
                          'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300',
                          index === correctScorePredictions.length - 1 && 'border-b-0',
                          index % 2 === 0 && 'bg-gray-50/50'
                        )}
                      >
                        {/* Time & League */}
                        <div className="col-span-3 lg:col-span-2">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {formatTime(pred.kickoff_time)}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 lg:mt-1 truncate">{pred.league}</div>
                        </div>

                        {/* Teams */}
                        <div className="col-span-4 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            {getTeamLogo(pred.home_team) ? (
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image
                                  src={getTeamLogo(pred.home_team)!}
                                  alt={pred.home_team}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${pred.home_team.charAt(0)}</div>`
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {pred.home_team.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {pred.home_team}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getTeamLogo(pred.away_team) ? (
                              <div className="relative w-6 h-6 flex-shrink-0">
                                <Image
                                  src={getTeamLogo(pred.away_team)!}
                                  alt={pred.away_team}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                  unoptimized
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    const parent = e.currentTarget.parentElement
                                    if (parent) {
                                      parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${pred.away_team.charAt(0)}</div>`
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {pred.away_team.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {pred.away_team}
                            </span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="col-span-1 text-center">
                              <Badge variant="secondary" className="text-xs">{pred.score_prediction}</Badge>
                        </div>

                        {/* Odds */}
                        <div className="col-span-1 text-center hidden md:block">
                          <span className="text-sm font-semibold text-gray-900">{pred.odds ? pred.odds.toFixed(2) : 'N/A'}</span>
                        </div>

                        {/* Status */}
                        <div className="col-span-1 text-center hidden sm:block">
                              <Badge
                            variant={pred.status === 'finished' ? 'default' : pred.status === 'live' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {pred.status}
                              </Badge>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-2">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Link href={`/admin/predictions/add-correct-score?edit=${pred.id}`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(pred.id, 'correct-score')}
                            disabled={deletingId === pred.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {correctScorePredictions.map((pred) => {
                      const homeLogo = getTeamLogo(pred.home_team)
                      const awayLogo = getTeamLogo(pred.away_team)
                      
                      return (
                      <Card key={pred.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {homeLogo ? (
                                  <div className="relative w-5 h-5 flex-shrink-0">
                                    <Image
                                      src={homeLogo}
                                      alt={pred.home_team}
                                      width={20}
                                      height={20}
                                      className="object-contain rounded-full"
                                      unoptimized
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {pred.home_team.charAt(0)}
                                  </div>
                                )}
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {pred.home_team}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {awayLogo ? (
                                  <div className="relative w-5 h-5 flex-shrink-0">
                                    <Image
                                      src={awayLogo}
                                      alt={pred.away_team}
                                      width={20}
                                      height={20}
                                      className="object-contain rounded-full"
                                      unoptimized
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {pred.away_team.charAt(0)}
                                  </div>
                                )}
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {pred.away_team}
                                </p>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{pred.league}</p>
                            </div>
                            <Badge
                              variant={
                                pred.status === 'finished'
                                  ? 'default'
                                  : pred.status === 'live'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className="text-xs ml-2 flex-shrink-0"
                            >
                              {pred.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">Score:</span>
                              <Badge variant="secondary" className="text-xs">{pred.score_prediction}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600">Odds:</span>
                              <span className="text-xs font-semibold">{pred.odds || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                            >
                              <Link href={`/admin/predictions/add-correct-score?edit=${pred.id}`}>
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleDeleteClick(pred.id, 'correct-score')}
                              disabled={deletingId === pred.id}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Prediction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this prediction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={!!deletingId}
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

