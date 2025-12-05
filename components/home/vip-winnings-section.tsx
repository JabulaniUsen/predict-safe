'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VIPWinning } from '@/types'
import { formatDate } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import Image from 'next/image'

interface VIPWinningsSectionProps {
  planIds?: string[] // Optional: filter by plan IDs
  showAll?: boolean // If true, show all wins regardless of plan
}

export function VIPWinningsSection({ planIds, showAll = true }: VIPWinningsSectionProps) {
  const [winnings, setWinnings] = useState<VIPWinning[]>([])
  const [loading, setLoading] = useState(true)
  const [teamLogos, setTeamLogos] = useState<Record<string, string | null>>({})
  const [leagueNames, setLeagueNames] = useState<Record<string, string>>({}) // winning.id -> league_name
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const limitPerPlan = 6 // Number of winnings to show per plan

  useEffect(() => {
    fetchWinnings()
  }, [planIds, showAll, selectedDate])

  useEffect(() => {
    if (winnings.length > 0) {
      fetchTeamLogos()
    }
  }, [winnings])

  const fetchWinnings = async () => {
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('vip_winnings')
      .select('*')
      .order('date', { ascending: false })

    // Filter by plan IDs if provided and not showing all
    if (!showAll && planIds && planIds.length > 0) {
      query = query.in('plan_id', planIds)
    }

    // Filter by selected date if provided
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const startOfDay = `${dateStr}T00:00:00.000Z`
      const endOfDay = `${dateStr}T23:59:59.999Z`
      query = query.gte('date', startOfDay).lte('date', endOfDay)
    }
    
    // Fetch more winnings to ensure we have enough for each plan
    const { data, error } = await query.limit(100)

    if (error) {
      console.error('Error fetching winnings:', error)
      setWinnings([])
    } else {
      setWinnings(data || [])
    }

    setLoading(false)
  }

  const handleTodayClick = () => {
    setSelectedDate(new Date())
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleClearDate = () => {
    setSelectedDate(undefined)
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

  const fetchTeamLogos = async () => {
    if (winnings.length === 0) return

    // Group winnings by date
    const winningsByDate = new Map<string, VIPWinning[]>()
    winnings.forEach((winning) => {
      const date = new Date(winning.date).toISOString().split('T')[0]
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
      const fixturesByDate = new Map<string, any[]>()
      fixtureResults.forEach(({ date, fixtures }) => {
        fixturesByDate.set(date, fixtures)
      })
      
      // Match winnings to fixtures and extract logos and league names
      const newLeagueNames: Record<string, string> = {}
      
      for (const [date, dateWinnings] of winningsByDate.entries()) {
        const fixtures = fixturesByDate.get(date) || []
        
        dateWinnings.forEach((winning) => {
          // Find matching fixture by team names
          const fixture = fixtures.find((f: any) => {
            const homeMatch = f.match_hometeam_name?.toLowerCase() === winning.home_team.toLowerCase() ||
                             f.match_hometeam_name?.toLowerCase().includes(winning.home_team.toLowerCase()) ||
                             winning.home_team.toLowerCase().includes(f.match_hometeam_name?.toLowerCase() || '')
            
            const awayMatch = f.match_awayteam_name?.toLowerCase() === winning.away_team.toLowerCase() ||
                             f.match_awayteam_name?.toLowerCase().includes(winning.away_team.toLowerCase()) ||
                             winning.away_team.toLowerCase().includes(f.match_awayteam_name?.toLowerCase() || '')
            
            return homeMatch && awayMatch
          })
          
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

  const getTeamLogo = (teamName: string): string | null => {
    return teamLogos[teamName] || null
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
    <section className="py-4 lg:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-4 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af]">VIP Winnings</h2>
            <p className="text-sm lg:text-base text-gray-600">Track our successful VIP predictions</p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left",
                    !selectedDate && "text-gray-600 hover:text-[#1e40af] hover:bg-white",
                    selectedDate && "bg-[#1e40af] text-white"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="outline"
              onClick={handleTodayClick}
              className={cn(
                "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all",
                !selectedDate || (selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
                  ? "bg-[#1e40af] text-white"
                  : "text-gray-600 hover:text-[#1e40af] hover:bg-white"
              )}
            >
              Today
            </Button>
            {selectedDate && (
              <Button
                variant="outline"
                onClick={handleClearDate}
                className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all text-gray-600 hover:text-[#1e40af] hover:bg-white"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <>
            {/* Mobile Loading State */}
            <div className="lg:hidden space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 space-y-2 animate-pulse">
                  <div className="h-4 w-16 bg-gray-300 rounded" />
                  <div className="h-3 w-20 bg-gray-300 rounded" />
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-3 gap-2 text-xs font-semibold">
                    <div>Result</div>
                    <div>Tip</div>
                    <div>League</div>
                  </div>
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-3 gap-2">
                    <div className="h-4 w-12 bg-gray-300 rounded" />
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="h-4 w-20 bg-gray-300 rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading State */}
            <div className="hidden lg:block space-y-8">
              {[1, 2].map((planIndex) => (
                <div key={planIndex} className="space-y-4">
                  <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-0 border rounded-lg overflow-hidden bg-white">
                    <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-6 py-3 grid grid-cols-12 gap-4 items-center font-semibold text-sm">
                      <div className="col-span-2">Date</div>
                      <div className="col-span-5">Teams</div>
                      <div className="col-span-1 text-center">Result</div>
                      <div className="col-span-2 text-center">Tip</div>
                      <div className="col-span-2 text-center">League</div>
                    </div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-t animate-pulse">
                        <div className="col-span-2">
                          <div className="h-4 w-20 bg-gray-200 rounded" />
                        </div>
                        <div className="col-span-5">
                          <div className="h-4 w-32 bg-gray-200 rounded" />
                        </div>
                        <div className="col-span-1">
                          <div className="h-6 w-12 bg-gray-200 rounded mx-auto" />
                        </div>
                        <div className="col-span-2">
                          <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
                        </div>
                        <div className="col-span-2">
                          <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : planNames.length === 0 ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No winnings records available.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {planNames.map((planName) => {
              const planWinnings = groupedWinnings[planName].slice(0, limitPerPlan)
              
              return (
                <div key={planName} className="space-y-4">
                  {/* Plan Header */}
                  <div className="flex items-center justify-between border-b-2 border-[#1e40af] pb-2">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#1e40af]">{planName}</h3>
                    </div>
                  </div>

                  {/* Mobile View */}
                  <div className="lg:hidden space-y-3">
                    {planWinnings.map((winning) => (
                <div
                  key={winning.id}
                  className="bg-gray-100 rounded-lg p-3 space-y-2"
                >
                  {/* Top Row: Date and Home Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDate(winning.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{winning.home_team}</span>
                      {getTeamLogo(winning.home_team) ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={getTeamLogo(winning.home_team)!}
                            alt={winning.home_team}
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
                          {winning.home_team.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Second Row: League and Away Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{winning.league || 'League'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{winning.away_team}</span>
                      {getTeamLogo(winning.away_team) ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={getTeamLogo(winning.away_team)!}
                            alt={winning.away_team}
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
                          {winning.away_team.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Header Bar */}
                  <div className="bg-[#1e40af] text-white px-2 py-2 rounded grid grid-cols-3 gap-1 text-[10px] sm:text-xs font-semibold">
                    <div className="text-center">Result</div>
                    <div className="text-center">Tip</div>
                    <div className="text-center">League</div>
                  </div>

                  {/* Data Row */}
                  <div className="bg-gray-200 px-2 py-2 rounded grid grid-cols-3 gap-1 items-center">
                    <div className="flex items-center justify-center">
                      <Badge
                        className={`text-[10px] sm:text-xs px-1.5 py-0.5 ${winning.result === 'win' ? 'bg-[#22c55e] text-white font-bold' : 'bg-red-500 text-white font-bold'}`}
                      >
                        {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                      </Badge>
                    </div>
                    <div className="text-[10px] sm:text-xs font-semibold text-[#1e40af] text-center truncate">
                      {winning.prediction_type}
                    </div>
                    <div className="text-[10px] sm:text-xs font-medium text-gray-600 text-center truncate">
                      {getLeagueName(winning)}
                    </div>
                  </div>
                    </div>
                    ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-6 py-4 grid grid-cols-12 gap-4 items-center font-bold text-sm shadow-md">
                      <div className="col-span-2">Date</div>
                      <div className="col-span-5">Teams</div>
                      <div className="col-span-1 text-center">Result</div>
                      <div className="col-span-2 text-center">Tip</div>
                      <div className="col-span-2 text-center">League</div>
                    </div>

                    {/* Winnings */}
                    {planWinnings.map((winning, index) => (
                <div
                  key={winning.id}
                  className={cn(
                    'px-6 py-5 grid grid-cols-12 gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300',
                    index === winnings.length - 1 && 'border-b-0',
                    index % 2 === 0 && 'bg-gray-50/50'
                  )}
                >
                  {/* Date */}
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(winning.date)}
                    </div>
                    {winning.league && (
                      <div className="text-xs text-gray-500 mt-1 truncate">{winning.league}</div>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-3">
                      {getTeamLogo(winning.home_team) ? (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <Image
                            src={getTeamLogo(winning.home_team)!}
                            alt={winning.home_team}
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${winning.home_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {winning.home_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
                        {winning.home_team}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">vs</span>
                      {getTeamLogo(winning.away_team) ? (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <Image
                            src={getTeamLogo(winning.away_team)!}
                            alt={winning.away_team}
                            width={32}
                            height={32}
                            className="object-contain"
                            unoptimized
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent) {
                                parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">${winning.away_team.charAt(0)}</div>`
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {winning.away_team.charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-900 truncate min-w-0">
                        {winning.away_team}
                      </span>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="col-span-1 flex justify-center">
                    <Badge
                      className={`text-xs ${winning.result === 'win' ? 'bg-[#22c55e] text-white font-bold' : 'bg-red-500 text-white font-bold'}`}
                    >
                      {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                    </Badge>
                  </div>

                  {/* Tip */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-semibold text-[#1e40af]">
                      {winning.prediction_type}
                    </span>
                  </div>

                  {/* League */}
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-medium text-gray-600">
                      {getLeagueName(winning)}
                    </span>
                  </div>
                </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

