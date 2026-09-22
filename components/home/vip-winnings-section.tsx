'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VIPWinning } from '@/types'
import { formatDateShort } from '@/lib/utils/date'
import { findFixtureForPrediction } from '@/lib/utils/fixture-match'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ArrowRight, BarChart3, CalendarIcon, Goal, Layers, Star, Trophy } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Badge icon and accent stripe per plan.
 *
 * Keyed on the plan name stored against each win rather than a slug, because
 * vip_winnings records the display name. Matching is loose so a renamed plan
 * (Profit Multiplier -> Daily 50 Odds Combo) still resolves, and anything
 * unrecognised falls back to a trophy rather than rendering nothing.
 */
function getPlanStyle(planName: string): { Icon: typeof Trophy; accent: string } {
  const name = planName.toLowerCase()
  if (name.includes('correct score')) return { Icon: Goal, accent: 'bg-[#1e40af]' }
  if (name.includes('2 odds')) return { Icon: BarChart3, accent: 'bg-[#0ea5e9]' }
  if (name.includes('50 odds') || name.includes('profit multiplier')) {
    return { Icon: Layers, accent: 'bg-[#6366f1]' }
  }
  if (name.includes('standard')) return { Icon: Star, accent: 'bg-[#f97316]' }
  return { Icon: Trophy, accent: 'bg-[#1e40af]' }
}

interface VIPWinningsSectionProps {
  planIds?: string[] // Optional: filter by plan IDs
  showAll?: boolean // If true, show all wins regardless of plan
  showSeeMoreLink?: boolean
}

interface APIFixture {
  match_id?: string | null
  match_hometeam_name?: string
  match_awayteam_name?: string
  team_home_badge?: string
  team_away_badge?: string
  league_name?: string
}

export function VIPWinningsSection({ planIds, showAll = true, showSeeMoreLink = false }: VIPWinningsSectionProps) {
  const [winnings, setWinnings] = useState<VIPWinning[]>([])
  const [loading, setLoading] = useState(true)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})
  const [leagueNames, setLeagueNames] = useState<Record<string, string>>({}) // winning.id -> league_name
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const initialLimitPerPlan = 2 // Number of winnings to show per plan initially

  async function fetchWinnings() {
    setLoading(true)
    const supabase = createClient()
    
    // Filter by plan IDs if provided and not showing all
    let baseQuery = supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })

    if (!showAll && planIds && planIds.length > 0) {
      baseQuery = baseQuery.in('plan_id', planIds)
    }

    // Check if we should look for today's winnings
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const startOfToday = `${todayStr}T00:00:00.000Z`
    const endOfToday = `${todayStr}T23:59:59.999Z`

    // Determine if we're looking for today's date
    const isLookingForToday = !selectedDate || format(selectedDate, 'yyyy-MM-dd') === todayStr

    // If a specific date other than today is selected, filter by that date
    if (selectedDate && !isLookingForToday) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const startOfDay = `${dateStr}T00:00:00.000Z`
      const endOfDay = `${dateStr}T23:59:59.999Z`
      const { data, error } = await baseQuery
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .limit(100)

      if (error) {
        console.error('Error fetching winnings:', error)
        setWinnings([])
      } else {
        setWinnings(data || [])
      }
      setLoading(false)
      return
    }

    // If looking for today's winnings (either no date selected or today is selected)
    // Try to fetch today's winnings first
    const todayQuery = baseQuery
      .gte('date', startOfToday)
      .lte('date', endOfToday)
      .limit(100)

    const { data: todayData, error: todayError } = await todayQuery

    if (todayError) {
      console.error('Error fetching today\'s winnings:', todayError)
    }

    // If there are winnings for today, use them
    if (todayData && todayData.length > 0) {
      setWinnings(todayData)
      setLoading(false)
      return
    }

    // If no winnings for today, fetch the most recent day's winnings
    // First, get the most recent winning to find the date
    let recentQuery = supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)

    if (!showAll && planIds && planIds.length > 0) {
      recentQuery = recentQuery.in('plan_id', planIds)
    }

    const { data: recentData, error: recentError } = await recentQuery

    if (recentError) {
      console.error('Error fetching most recent winnings:', recentError)
      setWinnings([])
      setLoading(false)
      return
    }

    if (!recentData || recentData.length === 0) {
      // No winnings at all
      setWinnings([])
      setLoading(false)
      return
    }

    // Get the most recent date
    const mostRecentWinning = recentData[0] as VIPWinning
    const mostRecentDate = new Date(mostRecentWinning.date)
    const mostRecentDateStr = format(mostRecentDate, 'yyyy-MM-dd')
    const startOfMostRecentDay = `${mostRecentDateStr}T00:00:00.000Z`
    const endOfMostRecentDay = `${mostRecentDateStr}T23:59:59.999Z`

    // Now fetch all winnings from that most recent day
    let mostRecentDayQuery = supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })
      .gte('date', startOfMostRecentDay)
      .lte('date', endOfMostRecentDay)
      .limit(100)

    if (!showAll && planIds && planIds.length > 0) {
      mostRecentDayQuery = mostRecentDayQuery.in('plan_id', planIds)
    }

    const { data: previousDayData, error: previousDayError } = await mostRecentDayQuery

    if (previousDayError) {
      console.error('Error fetching previous day winnings:', previousDayError)
      setWinnings([])
      setLoading(false)
      return
    }

    // Show the most recent day's winnings (persist until admin updates with new winnings)
    setWinnings(previousDayData || [])
    setLoading(false)
  }

  const handleLatestClick = () => {
    // "Latest" isn't pinned to today's date — it means "no specific date
    // filter", which is what makes fetchWinnings() fall back to the most
    // recent day with results when today has none yet.
    setSelectedDate(undefined)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleClearDate = () => {
    setSelectedDate(undefined)
  }

  const togglePlanExpansion = (planName: string) => {
    setExpandedPlans(prev => {
      const newSet = new Set(prev)
      if (newSet.has(planName)) {
        newSet.delete(planName)
      } else {
        newSet.add(planName)
      }
      return newSet
    })
  }

  // Group winnings by plan name
  const groupedWinnings = winnings.reduce((acc, winning) => {
    const planName = winning.plan_name || 'Other'
    if (!acc[planName]) {
      acc[planName] = []
    }
    acc[planName].push(winning)
    return acc
  }, {} as Record<string, VIPWinning[]>)

  // Get unique plan names sorted
  const planNames = Object.keys(groupedWinnings).sort()

  async function fetchTeamLogos() {
    if (winnings.length === 0) return

    // Group winnings by date
    const winningsByDate = new Map<string, VIPWinning[]>()
    winnings.forEach((winning) => {
      const date = String(winning.date).slice(0, 10)
      if (!winningsByDate.has(date)) {
        winningsByDate.set(date, [])
      }
      winningsByDate.get(date)!.push(winning)
    })

    try {
      const newLogos: Record<string, string | null> = {}
      
      // Fetch fixtures for each date
      const fixturePromises = Array.from(winningsByDate.keys()).map(async (date) => {
        try {
          const response = await fetch(`/api/football/fixtures?from=${date}&to=${date}`)
          if (!response.ok) return { date, fixtures: [] }
          
          const fixturesData = await response.json()
          const fixtures = Array.isArray(fixturesData) 
            ? fixturesData 
            : (Array.isArray(fixturesData?.data) ? fixturesData.data : [])
          return { date, fixtures }
        } catch (err) {
          console.error(`Error fetching fixtures for date ${date}:`, err)
          return { date, fixtures: [] }
        }
      })
      
      const fixtureResults = await Promise.all(fixturePromises)
      const fixturesByDate = new Map<string, APIFixture[]>()
      fixtureResults.forEach(({ date, fixtures }) => {
        fixturesByDate.set(date, fixtures)
      })
      
      // Match winnings to fixtures and extract logos and league names
      const newLeagueNames: Record<string, string> = {}
      
      for (const [date, dateWinnings] of winningsByDate.entries()) {
        const fixtures = fixturesByDate.get(date) || []
        
        dateWinnings.forEach((winning) => {
          const fixture = findFixtureForPrediction(fixtures, winning)
          
          // Extract team logos and league name from fixture
          if (fixture) {
            if (fixture.team_home_badge && !teamLogos[winning.home_team]) {
              newLogos[winning.home_team] = fixture.team_home_badge
            }
            if (fixture.team_away_badge && !teamLogos[winning.away_team]) {
              newLogos[winning.away_team] = fixture.team_away_badge
            }
            // Extract league name if winning doesn't have one
            if (!winning.league && fixture.league_name && !leagueNames[winning.id]) {
              newLeagueNames[winning.id] = fixture.league_name
            }
          }
        })
      }
      
      // Update state with new logos and league names
      if (Object.keys(newLogos).length > 0) {
        setTeamLogos((prev) => ({ ...prev, ...newLogos }))
      }
      if (Object.keys(newLeagueNames).length > 0) {
        setLeagueNames((prev) => ({ ...prev, ...newLeagueNames }))
      }
    } catch (error) {
      console.error('Error fetching team logos:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchWinnings()
    }, 0)
    return () => clearTimeout(timer)
  }, [planIds, showAll, selectedDate])

  useEffect(() => {
    if (winnings.length > 0) {
      const timer = setTimeout(() => {
        void fetchTeamLogos()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [winnings])

  const getTeamLogo = (teamName: string): string | null => {
    return teamLogos[teamName] || null
  }

  const getOdds = (winning: VIPWinning): string | null => {
    const odds = (winning as any).odds
    if (odds === null || odds === undefined) return null
    const parsed = Number(odds)
    return Number.isFinite(parsed) ? parsed.toFixed(2) : null
  }

  const getLeagueName = (winning: VIPWinning): string => {
    // First check if we fetched it from fixtures
    if (leagueNames[winning.id]) {
      return leagueNames[winning.id]
    }
    // Then check if it's in the database
    if (winning.league) {
      return winning.league
    }
    // Default fallback
    return '-'
  }
  return (
    <section className="py-6 lg:py-12 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0f172a]">
              VIP Winning History
            </h2>
            <p className="mt-1 text-sm lg:text-base text-gray-500">
              Track our successful VIP predictions
            </p>
          </div>
          {showSeeMoreLink && (
            <Link
              href="/previous-wins"
              className="inline-flex items-center gap-1.5 text-sm lg:text-base font-semibold text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
            >
              See More
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Date controls */}
        <div className="mb-6 inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-10 gap-2 rounded-lg px-4 text-sm font-medium',
                  selectedDate
                    ? 'bg-[#1e40af] text-white hover:bg-[#1e3a8a] hover:text-white'
                    : 'text-gray-500 hover:text-[#1e40af]'
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} initialFocus />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            onClick={handleLatestClick}
            className={cn(
              'h-10 rounded-lg px-5 text-sm font-semibold',
              selectedDate
                ? 'text-gray-500 hover:text-[#1e40af]'
                : 'bg-[#1e40af] text-white hover:bg-[#1e3a8a] hover:text-white'
            )}
          >
            Latest
          </Button>

          {selectedDate && (
            <Button
              variant="ghost"
              onClick={handleClearDate}
              className="h-10 rounded-lg px-4 text-sm font-medium text-gray-500 hover:text-[#1e40af]"
            >
              Clear
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-200 animate-pulse">
                <div className="h-1.5 bg-gray-200" />
                <div className="flex items-center gap-3 p-4">
                  <div className="h-11 w-11 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/5 rounded bg-gray-200" />
                    <div className="h-3 w-3/5 rounded bg-gray-100" />
                  </div>
                </div>
                {[1, 2].map((j) => (
                  <div key={j} className="space-y-2 border-t border-gray-100 p-4">
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                    <div className="h-4 w-3/5 rounded bg-gray-200" />
                    <div className="h-4 w-2/5 rounded bg-gray-200" />
                    <div className="h-9 rounded-lg bg-gray-100" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : planNames.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {selectedDate
                  ? 'No winnings recorded for this date.'
                  : 'No winnings records available.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              {planNames.map((planName) => {
                const allPlanWinnings = groupedWinnings[planName]
                const isExpanded = expandedPlans.has(planName)
                const hasMore = allPlanWinnings.length > initialLimitPerPlan
                const planWinnings = isExpanded
                  ? allPlanWinnings
                  : allPlanWinnings.slice(0, initialLimitPerPlan)

                const { Icon, accent } = getPlanStyle(planName)

                // The card subtitle should describe what is actually on it -
                // these rows can include a loss, and calling that a winning
                // prediction would be untrue.
                const allWins = planWinnings.every((w) => w.result === 'win')
                const subtitle = `Last ${planWinnings.length} ${
                  allWins ? 'winning prediction' : 'result'
                }${planWinnings.length === 1 ? '' : 's'}`

                return (
                  <article
                    key={planName}
                    className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className={cn('h-1.5', accent)} />

                    <header className="flex items-center gap-3 p-4">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1e40af]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold uppercase tracking-wide text-[#0f172a]">
                          {planName}
                        </h3>
                        <p className="truncate text-xs text-gray-500">{subtitle}</p>
                      </div>
                      {hasMore && (
                        <button
                          type="button"
                          onClick={() => togglePlanExpansion(planName)}
                          className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-[#1e40af] hover:text-[#1e3a8a] transition-colors"
                        >
                          {isExpanded ? 'Show Less' : 'See All'}
                          {!isExpanded && <ArrowRight className="h-4 w-4" />}
                        </button>
                      )}
                    </header>

                    <div className="flex-1">
                      {planWinnings.map((winning) => {
                        const odds = getOdds(winning)
                        const won = winning.result === 'win'

                        return (
                          <div key={winning.id} className="border-t border-gray-100 p-4">
                            {/* Date and competition */}
                            <p className="mb-2.5 truncate text-xs text-gray-500">
                              {formatDateShort(winning.date)}
                              <span className="mx-1.5 text-gray-300">•</span>
                              {getLeagueName(winning)}
                            </p>

                            {/* Teams and the final score */}
                            <div className="space-y-1.5">
                              {(
                                [
                                  { team: winning.home_team, score: (winning as any).home_score },
                                  { team: winning.away_team, score: (winning as any).away_score },
                                ] as const
                              ).map(({ team, score }, side) => (
                                <div key={side} className="flex items-center gap-2.5">
                                  {getTeamLogo(team) ? (
                                    <Image
                                      src={getTeamLogo(team)!}
                                      alt=""
                                      width={20}
                                      height={20}
                                      className="h-5 w-5 flex-shrink-0 rounded-full object-contain"
                                      unoptimized
                                      onError={(e) => {
                                        e.currentTarget.style.visibility = 'hidden'
                                      }}
                                    />
                                  ) : (
                                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                                      {team.charAt(0)}
                                    </span>
                                  )}
                                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-[#0f172a]">
                                    {team}
                                  </span>
                                  <span className="flex-shrink-0 text-lg font-bold tabular-nums text-[#0f172a]">
                                    {score ?? '–'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* The bet: tip, price taken, outcome */}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-3 py-2.5">
                              <span className="text-xs text-gray-500">
                                Prediction:{' '}
                                <span className="font-semibold text-[#0f172a]">
                                  {winning.prediction_type || '–'}
                                </span>
                              </span>
                              <span className="text-xs text-gray-500">
                                Odds:{' '}
                                <span className="font-bold tabular-nums text-[#0f172a]">
                                  {odds ?? '–'}
                                </span>
                              </span>
                              <Badge
                                className={cn(
                                  'ml-auto rounded-full px-3 py-0.5 text-xs font-bold',
                                  won ? 'bg-[#22c55e] text-white' : 'bg-red-500 text-white'
                                )}
                              >
                                {won ? 'WON' : 'LOST'}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
            </div>

            {showSeeMoreLink && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-blue-50/70 p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#1e40af]">
                    <Trophy className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-[#0f172a]">More Winning History</p>
                    <p className="text-sm text-gray-500">
                      View all past VIP predictions and results
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="h-11 rounded-lg bg-[#1e40af] px-6 font-semibold text-white hover:bg-[#1e3a8a]"
                >
                  <Link href="/previous-wins">
                    View All Results
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
