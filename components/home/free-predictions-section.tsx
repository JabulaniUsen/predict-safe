'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, getDateRange } from '@/lib/utils/date'
import { Fixture, getFixtures, getOdds } from '@/lib/api-football'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CircularProgress } from '@/components/ui/circular-progress'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

const FILTERS = [
  { id: 'free', label: 'Safe free picks', slug: 'safe-free-picks' },
  { id: 'all', label: 'All Tips', slug: 'all-tips' },
  { id: 'super_single', label: 'Super Single', slug: 'super-single' },
  { id: 'double_chance', label: 'Double Chance', slug: 'double-chance' },
  { id: 'home_win', label: 'Home Win', slug: 'home-win' },
  { id: 'away_win', label: 'Away Win', slug: 'away-win' },
  { id: 'over_1_5', label: '1.5 Goals', slug: '1-5-goals' },
  { id: 'over_2_5', label: '2.5 Goals', slug: '2-5-goals' },
  { id: 'btts', label: 'BTTS/GG', slug: 'btts-gg' },
]

// Map slug to filter ID
const SLUG_TO_FILTER: Record<string, string> = {
  'safe-free-picks': 'free',
  'all-tips': 'all',
  'super-single': 'super_single',
  'double-chance': 'double_chance',
  'home-win': 'home_win',
  'away-win': 'away_win',
  '1-5-goals': 'over_1_5',
  '2-5-goals': 'over_2_5',
  'btts-gg': 'btts',
}

interface FreePrediction {
  id: string
  home_team: string
  away_team: string
  league: string
  prediction_type: string
  odds: number
  confidence: number
  kickoff_time: string
  status: 'not_started' | 'live' | 'finished'
  home_team_logo?: string
  away_team_logo?: string
  home_score?: string
  away_score?: string
  match_id?: string
}

export function FreePredictionsSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [predictions, setPredictions] = useState<FreePrediction[]>([])
  
  // Get initial filter from URL or default to 'free'
  const getInitialFilter = () => {
    const filterParam = searchParams.get('filter')
    if (filterParam && SLUG_TO_FILTER[filterParam]) {
      return SLUG_TO_FILTER[filterParam]
    }
    return 'free'
  }
  
  const [selectedFilter, setSelectedFilter] = useState(getInitialFilter)
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow' | 'custom'>('today')
  const [customDate, setCustomDate] = useState<string>('')
  const [daysBack, setDaysBack] = useState<number>(0) // Track how many days back from today
  const [loading, setLoading] = useState(true)

  // Update URL when filter changes
  const handleFilterChange = (filterId: string) => {
    setSelectedFilter(filterId)
    const filter = FILTERS.find(f => f.id === filterId)
    if (filter) {
      // Update URL with the filter slug
      const params = new URLSearchParams(searchParams.toString())
      params.set('filter', filter.slug)
      router.push(`/?${params.toString()}`, { scroll: false })
    }
  }

  // Sync filter with URL on mount and when URL changes
  useEffect(() => {
    const filterParam = searchParams.get('filter')
    if (filterParam && SLUG_TO_FILTER[filterParam]) {
      const filterId = SLUG_TO_FILTER[filterParam]
      if (filterId !== selectedFilter) {
        setSelectedFilter(filterId)
      }
    } else if (!filterParam && selectedFilter !== 'free') {
      // If no filter in URL and not default, set to default
      setSelectedFilter('free')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true)
      try {
        const { from, to } = getDateRange(dateType, customDate, daysBack)
        
        // Fetch fixtures from API Football
        const fixtures = await getFixtures(from, undefined, to)
        
        if (!Array.isArray(fixtures) || fixtures.length === 0) {
          setPredictions([])
          setLoading(false)
          return
        }

        // Convert fixtures to predictions
        const allPredictions: FreePrediction[] = []
        
        // Determine max predictions based on filter
        // "free" (Safe Picks) should have minimum 5 games, but we'll collect more to ensure we have enough after filtering
        const maxPredictions = selectedFilter === 'free' ? 5 : 15
        const minPredictions = selectedFilter === 'free' ? 5 : 0 // Minimum required for free filter
        
        // Track which prediction types we've used to ensure variety
        // Safe free picks only use: Super Single, Double Chance, Home Win, Away Win, 1.5 Goals
        const typeRotation = selectedFilter === 'free'
          ? ['Home Win', 'Away Win', 'Over 1.5', 'Double Chance']
          : ['Home Win', 'Away Win', 'Over 2.5', 'Over 1.5', 'BTTS', 'Double Chance']
        let typeIndex = 0
        
        // For "all" filter, we need to collect all predictions from all filters
        if (selectedFilter === 'all') {
          // Limit fixtures to process (increase to ensure we find enough matches with specific odds)
          const fixturesToProcess = fixtures.slice(0, 30)
          
          // Fetch all odds in parallel
          const oddsPromises = fixturesToProcess.map(async (fixture) => {
            try {
              const odds = await getOdds(fixture.match_id)
              return { matchId: fixture.match_id, odds: Array.isArray(odds) && odds.length > 0 ? odds[0] : null }
            } catch (error) {
              console.error(`Error fetching odds for ${fixture.match_id}:`, error)
              return { matchId: fixture.match_id, odds: null }
            }
          })
          
          const oddsResults = await Promise.all(oddsPromises)
          const oddsMap = new Map(oddsResults.map(r => [r.matchId, r.odds]))
          
          // Process all fixtures and create predictions for all available types
          for (const fixture of fixturesToProcess) {
            try {
              // Get odds from the map
              const oddsData = oddsMap.get(fixture.match_id) || null

              // Create predictions for all available types
              const predictionTypes: Array<{ type: string, odds: number }> = []
              
              if (oddsData) {
                // Helper to check if odds are in range (1.15 - 1.60)
                const isInRange = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return val >= 1.15 && val <= 1.60
                }

                if (isInRange(oddsData.odd_1)) predictionTypes.push({ type: 'Home Win', odds: parseFloat(oddsData.odd_1!) })
                if (isInRange(oddsData.odd_2)) predictionTypes.push({ type: 'Away Win', odds: parseFloat(oddsData.odd_2!) })
                if (isInRange(oddsData['o+2.5'])) predictionTypes.push({ type: 'Over 2.5', odds: parseFloat(oddsData['o+2.5']!) })
                if (isInRange(oddsData['o+1.5'])) predictionTypes.push({ type: 'Over 1.5', odds: parseFloat(oddsData['o+1.5']!) })
                if (isInRange(oddsData.bts_yes)) predictionTypes.push({ type: 'BTTS', odds: parseFloat(oddsData.bts_yes!) })
                if (isInRange(oddsData.odd_1x)) predictionTypes.push({ type: 'Double Chance', odds: parseFloat(oddsData.odd_1x!) })
              } else {
                // Default predictions if no odds
                predictionTypes.push(
                  { type: 'Over 2.5', odds: 1.85 },
                  { type: 'Home Win', odds: 1.85 },
                  { type: 'BTTS', odds: 1.85 },
                  { type: 'Over 1.5', odds: 1.85 },
                  { type: 'Away Win', odds: 1.85 },
                  { type: 'Double Chance', odds: 1.85 }
                )
              }

              // Create a prediction for each available type
              for (const { type: predictionType, odds: typeOdds } of predictionTypes) {
                const confidence = Math.min(95, Math.max(60, 100 - (typeOdds - 1) * 20))
                
                allPredictions.push({
                  id: `${fixture.match_id}-${predictionType}`,
                  home_team: fixture.match_hometeam_name || 'Home Team',
                  away_team: fixture.match_awayteam_name || 'Away Team',
                  league: fixture.league_name || 'Unknown League',
                  prediction_type: predictionType,
                  odds: typeOdds,
                  confidence: confidence,
                  kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}`,
                  status: fixture.match_status === 'Finished' ? 'finished' : 
                          fixture.match_live === '1' ? 'live' : 'not_started',
                  home_team_logo: fixture.team_home_badge,
                  away_team_logo: fixture.team_away_badge,
                  home_score: fixture.match_hometeam_score || undefined,
                  away_score: fixture.match_awayteam_score || undefined,
                  match_id: fixture.match_id,
                })
              }
            } catch (error) {
              console.error(`Error processing fixture ${fixture.match_id}:`, error)
            }
          }
        } else {
          // For other filters, process fixtures until we have enough predictions
          // Increase buffer to find enough matches with the odds criteria
          // For safe free picks, use larger buffer to ensure we get minimum 5 games
          // Process more fixtures to account for filtering (odds range, prediction types)
          const buffer = selectedFilter === 'free' ? 50 : 10
          const fixturesToProcess = fixtures.slice(0, maxPredictions + buffer)
          
          // Fetch all odds in parallel for the fixtures we need
          const oddsPromises = fixturesToProcess.map(async (fixture) => {
            try {
              const odds = await getOdds(fixture.match_id)
              return { matchId: fixture.match_id, odds: Array.isArray(odds) && odds.length > 0 ? odds[0] : null }
            } catch (error) {
              console.error(`Error fetching odds for ${fixture.match_id}:`, error)
              return { matchId: fixture.match_id, odds: null }
            }
          })
          
          const oddsResults = await Promise.all(oddsPromises)
          const oddsMap = new Map(oddsResults.map(r => [r.matchId, r.odds]))
          
          for (const fixture of fixturesToProcess) {
            // For free filter, continue collecting until we have enough valid predictions
            // For other filters, stop when we reach maxPredictions
            if (selectedFilter !== 'free' && allPredictions.length >= maxPredictions) {
            break
          }
            // For free filter, we'll continue processing all fixtures in the buffer
            // and filter later to ensure we get at least 5 valid predictions
          
          try {
            // Get odds from the map
            const oddsData = oddsMap.get(fixture.match_id) || null

            // Determine prediction types based on filter
            const availableTypes: string[] = []
            let predictionType: string
            
            if (selectedFilter === 'free') {
                // Safe free picks: Only include specific categories
                // Categories: Super Single, Double Chance, Home Win, Away Win, 1.5 Goals
                // Filter by odds range 1.2 - 1.7
                const isInRange = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return val >= 1.2 && val <= 1.7
                }

              if (oddsData) {
                  // Only add allowed prediction types for safe free picks
                  if (isInRange(oddsData.odd_1)) availableTypes.push('Home Win')
                  if (isInRange(oddsData.odd_2)) availableTypes.push('Away Win')
                  if (isInRange(oddsData['o+1.5'])) availableTypes.push('Over 1.5')
                  if (isInRange(oddsData.odd_1x)) availableTypes.push('Double Chance')
                  // Note: Super Single will be the highest odd among Home Win, Away Win, Over 1.5
              } else {
                  // Default predictions if no odds - only allowed types
                  availableTypes.push('Home Win', 'Away Win', 'Over 1.5', 'Double Chance')
              }
              
              // Select prediction type from rotation to ensure variety
              let selectedType: string | null = null
              
              // Try to find a type from rotation that's available
              for (let i = 0; i < typeRotation.length; i++) {
                const rotatedType = typeRotation[(typeIndex + i) % typeRotation.length]
                if (availableTypes.includes(rotatedType)) {
                  selectedType = rotatedType
                  typeIndex = (typeIndex + i + 1) % typeRotation.length
                  break
                }
              }
              
              // If no match from rotation, use first available
              if (!selectedType && availableTypes.length > 0) {
                selectedType = availableTypes[0]
              } else if (!selectedType) {
                  // Default to Home Win for safe free picks
                  selectedType = 'Home Win'
              }
              
              predictionType = selectedType
            } else {
              // Filter-specific predictions
                // Apply odds filter 1.15-1.60 to all filters including super_single

                const isInRange = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return val >= 1.15 && val <= 1.60
                }

                if (selectedFilter === 'home_win' && isInRange(oddsData?.odd_1)) {
                availableTypes.push('Home Win')
                } else if (selectedFilter === 'away_win' && isInRange(oddsData?.odd_2)) {
                availableTypes.push('Away Win')
                } else if (selectedFilter === 'over_2_5' && isInRange(oddsData?.['o+2.5'])) {
                availableTypes.push('Over 2.5')
                } else if (selectedFilter === 'over_1_5' && isInRange(oddsData?.['o+1.5'])) {
                availableTypes.push('Over 1.5')
                } else if (selectedFilter === 'btts' && isInRange(oddsData?.bts_yes)) {
                availableTypes.push('BTTS')
                } else if (selectedFilter === 'double_chance' && isInRange(oddsData?.odd_1x)) {
                availableTypes.push('Double Chance')
              } else if (selectedFilter === 'super_single') {
                  // Super single - pick the best odds prediction within range
                if (oddsData) {
                    // Find the highest odd that is still within our range (1.15-1.60)
                    const validOptions = [
                      { type: 'Home Win', odd: parseFloat(oddsData.odd_1 || '0') },
                      { type: 'Away Win', odd: parseFloat(oddsData.odd_2 || '0') },
                      { type: 'Over 2.5', odd: parseFloat(oddsData['o+2.5'] || '0') }
                    ].filter(opt => opt.odd >= 1.15 && opt.odd <= 1.60)

                    // Sort by odds descending to get the "super" single (highest valid odd)
                    validOptions.sort((a, b) => b.odd - a.odd)

                    if (validOptions.length > 0) {
                      availableTypes.push(validOptions[0].type)
                  }
                  }
                }

                // If we found a valid type, use it
                if (availableTypes.length > 0) {
                  predictionType = availableTypes[0]
                } else {
                  // If no valid type found (e.g. odds not in range), skip this fixture
                  continue
                }
            }
            
            let odds = 1.85
            let confidence = 75

            // Get odds for this prediction type
            if (oddsData) {
              if (predictionType === 'Home Win' && oddsData.odd_1) {
                odds = parseFloat(oddsData.odd_1)
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              } else if (predictionType === 'Away Win' && oddsData.odd_2) {
                odds = parseFloat(oddsData.odd_2)
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              } else if (predictionType === 'Over 2.5' && oddsData['o+2.5']) {
                odds = parseFloat(oddsData['o+2.5'])
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              } else if (predictionType === 'Over 1.5' && oddsData['o+1.5']) {
                odds = parseFloat(oddsData['o+1.5'])
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              } else if (predictionType === 'BTTS' && oddsData.bts_yes) {
                odds = parseFloat(oddsData.bts_yes)
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              } else if (predictionType === 'Double Chance' && oddsData.odd_1x) {
                odds = parseFloat(oddsData.odd_1x)
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              }
            }

            allPredictions.push({
              id: `${fixture.match_id}-${predictionType}`,
              home_team: fixture.match_hometeam_name || 'Home Team',
              away_team: fixture.match_awayteam_name || 'Away Team',
              league: fixture.league_name || 'Unknown League',
              prediction_type: predictionType,
              odds: odds,
              confidence: confidence,
              kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}`,
              status: fixture.match_status === 'Finished' ? 'finished' : 
                      fixture.match_live === '1' ? 'live' : 'not_started',
              home_team_logo: fixture.team_home_badge,
              away_team_logo: fixture.team_away_badge,
              home_score: fixture.match_hometeam_score || undefined,
              away_score: fixture.match_awayteam_score || undefined,
              match_id: fixture.match_id,
            })
          } catch (error) {
            console.error(`Error processing fixture ${fixture.match_id}:`, error)
          }
        }
        }

        // Filter predictions based on odds range
        // For free filter: 1.2 to 1.7, for others: 1.15 to 1.60
        // Note: We already filtered during generation, but this is a safety check
        let filteredPredictions = allPredictions.filter(pred => {
          const odds = pred.odds
          if (selectedFilter === 'free') {
            return odds >= 1.2 && odds <= 1.7
          }
          return odds >= 1.15 && odds <= 1.60
        })

        // For safe free picks, ensure we only have allowed prediction types
        if (selectedFilter === 'free') {
          const allowedTypes = ['Home Win', 'Away Win', 'Over 1.5', 'Double Chance']
          filteredPredictions = filteredPredictions.filter(pred =>
            allowedTypes.includes(pred.prediction_type)
          )
        }

        // For "free" filter, ensure we have at least 5 games, then limit to 5
        // For others, use all collected predictions
        let finalPredictions: FreePrediction[]
        if (selectedFilter === 'free') {
          // Ensure we have at least 5 predictions for free filter
          if (filteredPredictions.length >= minPredictions) {
            finalPredictions = filteredPredictions.slice(0, 5)
          } else {
            // If we don't have enough, use what we have (but log a warning)
            console.warn(`Only found ${filteredPredictions.length} valid free predictions, minimum is ${minPredictions}`)
            finalPredictions = filteredPredictions
          }
        } else {
          finalPredictions = filteredPredictions
        }
        setPredictions(finalPredictions)
      } catch (error) {
        console.error('Error fetching predictions:', error)
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [selectedFilter, dateType, customDate, daysBack])

  const getFilterLabel = () => {
    const filter = FILTERS.find((f) => f.id === selectedFilter)
    return filter ? filter.label : 'Free Safe Picks'
  }

  const getDateLabel = () => {
    if (dateType === 'today') return formatDate(new Date())
    if (dateType === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return formatDate(tomorrow)
    }
    if (dateType === 'previous') {
      const previousDate = new Date()
      previousDate.setDate(previousDate.getDate() - daysBack)
      return formatDate(previousDate)
    }
    if (dateType === 'custom' && customDate) {
      return formatDate(new Date(customDate))
    }
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDate(yesterday)
  }

  const getCurrentDate = () => {
    if (dateType === 'today') return new Date()
    if (dateType === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow
    }
    if (dateType === 'previous') {
      const previousDate = new Date()
      previousDate.setDate(previousDate.getDate() - daysBack)
      return previousDate
    }
    if (dateType === 'custom' && customDate) {
      return new Date(customDate)
    }
    return new Date()
  }

  const handleDateChange = (direction: 'previous' | 'next') => {
    if (direction === 'previous') {
      if (dateType === 'today') setDateType('previous')
      else if (dateType === 'tomorrow') setDateType('today')
    } else {
      if (dateType === 'today') setDateType('tomorrow')
      else if (dateType === 'previous') setDateType('today')
    }
  }

  return (
    <section className="py-4 lg:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Mobile Header */}
        <div className="mb-4 lg:hidden">
          {/* Mobile Filters - Moved before title */}
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1.5 rounded-lg">
              {FILTERS.map((filter, index) => {
                const isActive = selectedFilter === filter.id
                // Row 1: Free Tips, All Tips, Super Single (indices 0-2) - each 1 column
                // Row 2: Double Chance (index 3) - spans 2 columns, Home Win (index 4) - 1 column
                // Row 3: Away Win, 1.5 Goals, 2.5 Goals (indices 5-7) - each 1 column
                // Row 4: BTTS/GG (index 8) - spans all 3 columns
                let colSpan = ''
                if (index === 3) {
                  colSpan = 'col-span-2' // Double Chance spans 2 columns
                } else if (index === 8) {
                  colSpan = 'col-span-3' // BTTS/GG spans all 3 columns
                }
                
                return (
                  <button
                    key={filter.id}
                    onClick={() => handleFilterChange(filter.id)}
                    className={`text-xs font-semibold rounded-md transition-all px-2 py-2.5 ${colSpan
                      } ${isActive
                        ? 'bg-[#1e40af] text-white'
                        : 'bg-white text-gray-600 hover:text-[#1e40af]'
                    }`}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>
          
          <h2 className="text-xl font-bold mb-2 text-gray-900">{getFilterLabel()}</h2>
          <p className="text-sm text-gray-600 mb-4">{getDateLabel()}</p>
          
          {/* Mobile Navigation */}
          <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left font-normal",
                    !customDate && dateType !== 'custom' && "text-gray-600 hover:text-[#1e40af] hover:bg-white",
                    (customDate || dateType === 'custom') && "bg-[#1e40af] text-white shadow-sm"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(new Date(customDate), 'MMM dd') : 'Select Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate ? new Date(customDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setCustomDate(format(date, 'yyyy-MM-dd'))
                      setDateType('custom')
                      setDaysBack(0)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => {
                setDateType('today')
                setCustomDate('')
                setDaysBack(0)
              }}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setDateType('tomorrow')
                setCustomDate('')
                setDaysBack(0)
              }}
              className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'tomorrow'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-4 lg:mb-8 hidden lg:block">
          {/* Desktop Filters - Moved before title */}
          <div className="mb-4">
            <Tabs value={selectedFilter} onValueChange={handleFilterChange}>
              <div className="overflow-x-auto">
                <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 bg-gray-100 p-1 rounded-lg min-w-[500px] lg:min-w-0">
                  {FILTERS.map((filter) => (
                    <TabsTrigger 
                      key={filter.id} 
                      value={filter.id} 
                      className="text-xs sm:text-sm font-semibold data-[state=active]:bg-[#1e40af] data-[state=active]:text-white rounded-md transition-all px-2 lg:px-4"
                    >
                      {filter.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </div>
          
          
        </div>

        <div className="mb-4 lg:mb-8 hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af]">{getFilterLabel()}</h2>
          <p className="text-sm lg:text-base text-gray-600">
            Get expert predictions for {getCurrentDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}'s matches
          </p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left font-normal",
                    !customDate && dateType !== 'custom' && "text-gray-600 hover:text-[#1e40af] hover:bg-white",
                    (customDate || dateType === 'custom') && "bg-[#1e40af] text-white shadow-sm"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(new Date(customDate), 'MMM dd') : 'Select Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate ? new Date(customDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setCustomDate(format(date, 'yyyy-MM-dd'))
                      setDateType('custom')
                      setDaysBack(0)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => {
                setDateType('today')
                setCustomDate('')
                setDaysBack(0)
              }}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setDateType('tomorrow')
                setCustomDate('')
                setDaysBack(0)
              }}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'tomorrow'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {loading ? (
          <>
            {/* Mobile Loading State */}
            <div className="lg:hidden space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 space-y-2 animate-pulse">
                  {/* Top Row: Time and Home Team */}
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-300 rounded" />
                      <div className="h-6 w-6 bg-gray-300 rounded-full" />
                    </div>
                  </div>

                  {/* Second Row: League and Away Team */}
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-gray-300 rounded" />
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-300 rounded" />
                      <div className="h-6 w-6 bg-gray-300 rounded-full" />
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
                    <div className="h-4 w-12 bg-gray-300 rounded" />
                    <div className="h-4 w-10 bg-gray-300 rounded mx-auto" />
                    <div className="h-8 w-8 bg-gray-300 rounded-full mx-auto" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading State */}
            <div className="hidden lg:block space-y-0 border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-600 text-white px-6 py-3 grid grid-cols-12 gap-4 items-center font-semibold text-sm">
              <div className="col-span-2">Time & League</div>
              <div className="col-span-5">Teams</div>
              <div className="col-span-1 text-center">Score</div>
              <div className="col-span-1 text-center">Tip</div>
              <div className="col-span-1 text-center">Odd</div>
              <div className="col-span-2 text-center">Confidence</div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4 grid grid-cols-12 gap-4 items-center border-t animate-pulse">
                <div className="col-span-2">
                  <div className="h-4 w-16 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-200 rounded mt-2" />
                </div>
                <div className="col-span-5 flex items-center gap-3">
                  <div className="h-6 w-6 bg-gray-200 rounded-full" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <span className="text-gray-400">vs</span>
                  <div className="h-6 w-6 bg-gray-200 rounded-full" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-12 bg-gray-200 rounded mx-auto" />
                </div>
                <div className="col-span-1">
                  <div className="h-6 w-16 bg-gray-200 rounded mx-auto" />
                </div>
                <div className="col-span-1">
                  <div className="h-4 w-12 bg-gray-200 rounded mx-auto" />
                </div>
                <div className="col-span-2 flex justify-center">
                  <div className="h-12 w-12 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
          </>
        ) : predictions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No predictions available for this date.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile View */}
            <div className="lg:hidden space-y-3">
              {predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  onClick={() => {
                    const matchId = `${prediction.match_id}-${prediction.prediction_type}`
                    window.location.href = `/match/${encodeURIComponent(matchId)}`
                  }}
                  className="bg-gray-100 rounded-lg p-3 space-y-2 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {/* Top Row: Time and Home Team */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {formatTime(prediction.kickoff_time)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.home_team}</span>
                      {prediction.home_team_logo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={prediction.home_team_logo}
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
                      {prediction.away_team_logo ? (
                        <div className="relative w-6 h-6 flex-shrink-0">
                          <Image
                            src={prediction.away_team_logo}
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

                  {/* Score Row - Show if game is finished or scores are available */}
                  {(prediction.status === 'finished' || (prediction.home_score !== undefined && prediction.away_score !== undefined)) && (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="text-sm font-semibold text-gray-900">
                        {prediction.home_score !== undefined && prediction.away_score !== undefined
                          ? `${prediction.home_score} - ${prediction.away_score}`
                          : prediction.status === 'finished'
                          ? 'FT'
                          : '-'}
                      </span>
                    </div>
                  )}

                  {/* Header Bar */}
                  <div className="bg-[#1e40af] text-white px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold">
                    <div className="text-center">Status</div>
                    <div className="text-center">Tip</div>
                    <div className="text-center">Score</div>
                    <div className="text-center">Odd</div>
                    <div className="text-center">Conf</div>
                  </div>

                  {/* Prediction Row */}
                  <div className="bg-gray-200 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center">
                    <div className="flex items-center justify-center">
                      <Badge
                        variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'}
                        className="text-[10px] px-1.5 py-0.5"
                      >
                        {prediction.status === 'finished' ? 'FT' : prediction.status === 'live' ? 'Live' : 'NS'}
                      </Badge>
                    </div>
                    <div className="text-[10px] sm:text-xs font-medium text-gray-900 text-center truncate">
                      {prediction.prediction_type === 'Over 1.5' ? 'Ov 1.5' :
                       prediction.prediction_type === 'Over 2.5' ? 'Ov 2.5' :
                       prediction.prediction_type === 'Home Win' ? '1' :
                       prediction.prediction_type === 'Away Win' ? '2' :
                       prediction.prediction_type === 'Double Chance' ? '12' :
                       prediction.prediction_type}
                    </div>
                    <div className="text-[10px] sm:text-xs font-semibold text-gray-900 text-center">
                      {prediction.status === 'finished' && prediction.home_score !== undefined && prediction.away_score !== undefined
                        ? `${prediction.home_score}-${prediction.away_score}`
                        : prediction.status === 'finished'
                        ? 'FT'
                        : '-'}
                    </div>
                    <div className="text-[10px] sm:text-[5px] font-semibold text-gray-900 text-center">
                      {prediction.odds.toFixed(2)}
                    </div>
                    <div className="flex items-center justify-center">
                      <CircularProgress value={prediction.confidence} size={40} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-3 sm:px-4 lg:px-6 py-3 lg:py-4 grid grid-cols-12 gap-2 lg:gap-4 items-center font-bold text-xs sm:text-sm shadow-md">
              <div className="col-span-2 lg:col-span-2">Time & League</div>
              <div className="col-span-4">Teams</div>
              <div className="col-span-1 text-center hidden sm:block">Score</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-center">Tip</div>
              <div className="col-span-1 text-center hidden md:block">Odd</div>
              <div className="col-span-2 text-center hidden lg:block">Confidence</div>
            </div>

            {/* Predictions */}
            {predictions.map((prediction, index) => (
                    <div
                      key={prediction.id}
                      onClick={() => {
                        const matchId = `${prediction.match_id}-${prediction.prediction_type}`
                        window.location.href = `/match/${encodeURIComponent(matchId)}`
                      }}
                      className={cn(
                        'px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 grid grid-cols-12 gap-2 lg:gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-[1.01] hover:border-l-4 hover:border-l-[#22c55e]',
                        index === predictions.length - 1 && 'border-b-0',
                        index % 2 === 0 && 'bg-gray-50/50'
                      )}
                    >
                      {/* Time & League */}
                      <div className="col-span-2 lg:col-span-2">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">
                          {formatTime(prediction.kickoff_time)}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 lg:mt-1 truncate">{prediction.league}</div>
                      </div>

                {/* Teams */}
                <div className="col-span-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {prediction.home_team_logo ? (
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={prediction.home_team_logo}
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
                    {prediction.away_team_logo ? (
                      <div className="relative w-6 h-6 flex-shrink-0">
                        <Image
                          src={prediction.away_team_logo}
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
                  {prediction.status === 'finished' && prediction.home_score !== undefined && prediction.away_score !== undefined ? (
                    <div className="text-sm font-semibold text-gray-900">
                      {prediction.home_score} - {prediction.away_score}
                    </div>
                  ) : prediction.status === 'finished' ? (
                    <div className="text-xs font-semibold text-gray-600">FT</div>
                  ) : (
                    <div className="text-xs text-gray-400">-</div>
                  )}
                </div>

                {/* Status */}
                <div className="col-span-1 text-center">
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
                <div className="col-span-1 text-center">
                  <span className="text-sm font-semibold text-gray-900">{prediction.odds.toFixed(2)}</span>
                </div>

                {/* Confidence */}
                <div className="col-span-2 flex justify-center">
                  <CircularProgress value={prediction.confidence} size={50} strokeWidth={5} />
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </section>
  )
}

