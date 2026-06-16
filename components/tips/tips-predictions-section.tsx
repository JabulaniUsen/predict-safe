'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTime, getDateRange } from '@/lib/utils/date'
import { Fixture, getFixtures, getOdds, FREE_PLAN_LEAGUES } from '@/lib/api-football'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CircularProgress } from '@/components/ui/circular-progress'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Loader2 } from 'lucide-react'
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

interface TipsPredictionsSectionProps {
  initialFilter: string
}

export function TipsPredictionsSection({ initialFilter }: TipsPredictionsSectionProps) {
  const router = useRouter()
  const [predictions, setPredictions] = useState<FreePrediction[]>([])
  const [selectedFilter, setSelectedFilter] = useState(initialFilter)
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow' | 'custom'>('today')
  const [customDate, setCustomDate] = useState<string>('')
  const [daysBack, setDaysBack] = useState<number>(1)
  const [loading, setLoading] = useState(true)

  const handleFilterChange = (filterId: string) => {
    const filter = FILTERS.find(f => f.id === filterId)
    if (filter) {
      router.push(`/tips/${filter.slug}`)
    }
  }

  useEffect(() => {
    setSelectedFilter(initialFilter)
  }, [initialFilter])

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true)
      try {
        const { from, to } = getDateRange(dateType, customDate, daysBack)

        const leagueFixtures = await Promise.all(
          FREE_PLAN_LEAGUES.map(leagueId =>
            getFixtures(from, leagueId, to).catch(() => [] as Fixture[])
          )
        )
        let fixtures: Fixture[] = leagueFixtures.flatMap(f => Array.isArray(f) ? f : [])

        // Fallback: if the top leagues have no fixtures for this date (e.g. off-season
        // or international tournament windows), fall back to all fixtures for the date
        if (fixtures.length === 0) {
          fixtures = await getFixtures(from, undefined, to).catch(() => [] as Fixture[])
        }

        if (!Array.isArray(fixtures) || fixtures.length === 0) {
          setPredictions([])
          setLoading(false)
          return
        }

        const allPredictions: FreePrediction[] = []
        const maxPredictions = selectedFilter === 'free' ? 5 : 15
        const minPredictions = selectedFilter === 'free' ? 5 : 0
        const typeRotation = selectedFilter === 'free'
          ? ['Home Win', 'Away Win', 'Over 1.5', 'Double Chance']
          : ['Home Win', 'Away Win', 'Over 2.5', 'Over 1.5', 'BTTS', 'Double Chance']
        let typeIndex = 0

        if (selectedFilter === 'all') {
          const fixturesToProcess = fixtures.slice(0, 60)
          const oddsPromises = fixturesToProcess.map(async (fixture) => {
            try {
              const odds = await getOdds(fixture.match_id)
              return { matchId: fixture.match_id, odds: Array.isArray(odds) && odds.length > 0 ? odds[0] : null }
            } catch {
              return { matchId: fixture.match_id, odds: null }
            }
          })
          const oddsResults = await Promise.all(oddsPromises)
          const oddsMap = new Map(oddsResults.map(r => [r.matchId, r.odds]))

          for (const fixture of fixturesToProcess) {
            try {
              const oddsData = oddsMap.get(fixture.match_id) || null
              const predictionTypes: Array<{ type: string, odds: number }> = []

              if (oddsData) {
                const isUsableOdd = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return Number.isFinite(val) && val > 1
                }
                if (isUsableOdd(oddsData.odd_1)) predictionTypes.push({ type: 'Home Win', odds: parseFloat(oddsData.odd_1!) })
                if (isUsableOdd(oddsData.odd_2)) predictionTypes.push({ type: 'Away Win', odds: parseFloat(oddsData.odd_2!) })
                if (isUsableOdd(oddsData['o+2.5'])) predictionTypes.push({ type: 'Over 2.5', odds: parseFloat(oddsData['o+2.5']!) })
                if (isUsableOdd(oddsData['o+1.5'])) predictionTypes.push({ type: 'Over 1.5', odds: parseFloat(oddsData['o+1.5']!) })
                if (isUsableOdd(oddsData.bts_yes)) predictionTypes.push({ type: 'BTTS', odds: parseFloat(oddsData.bts_yes!) })
                if (isUsableOdd(oddsData.odd_1x)) predictionTypes.push({ type: 'Double Chance', odds: parseFloat(oddsData.odd_1x!) })
              } else {
                continue
              }

              for (const { type: predictionType, odds: typeOdds } of predictionTypes) {
                const confidence = Math.min(95, Math.max(60, 100 - (typeOdds - 1) * 20))
                allPredictions.push({
                  id: `${fixture.match_id}-${predictionType}`,
                  home_team: fixture.match_hometeam_name || 'Home Team',
                  away_team: fixture.match_awayteam_name || 'Away Team',
                  league: fixture.league_name || 'Unknown League',
                  prediction_type: predictionType,
                  odds: typeOdds,
                  confidence,
                  kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}`,
                  status: fixture.match_status === 'Finished' ? 'finished' : fixture.match_live === '1' ? 'live' : 'not_started',
                  home_team_logo: fixture.team_home_badge,
                  away_team_logo: fixture.team_away_badge,
                  home_score: fixture.match_hometeam_score !== '' ? fixture.match_hometeam_score : undefined,
                  away_score: fixture.match_awayteam_score !== '' ? fixture.match_awayteam_score : undefined,
                  match_id: fixture.match_id,
                })
              }
            } catch {
              // skip bad fixture
            }
          }
        } else {
          const buffer = selectedFilter === 'free' ? 80 : 60
          const fixturesToProcess = fixtures.slice(0, maxPredictions + buffer)
          const oddsPromises = fixturesToProcess.map(async (fixture) => {
            try {
              const odds = await getOdds(fixture.match_id)
              return { matchId: fixture.match_id, odds: Array.isArray(odds) && odds.length > 0 ? odds[0] : null }
            } catch {
              return { matchId: fixture.match_id, odds: null }
            }
          })
          const oddsResults = await Promise.all(oddsPromises)
          const oddsMap = new Map(oddsResults.map(r => [r.matchId, r.odds]))

          for (const fixture of fixturesToProcess) {
            if (selectedFilter !== 'free' && allPredictions.length >= maxPredictions) break
            try {
              const oddsData = oddsMap.get(fixture.match_id) || null
              const availableTypes: string[] = []
              let predictionType: string

              if (selectedFilter === 'free') {
                const isInRange = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return val >= 1.2 && val <= 1.7
                }
                if (oddsData) {
                  if (isInRange(oddsData.odd_1)) availableTypes.push('Home Win')
                  if (isInRange(oddsData.odd_2)) availableTypes.push('Away Win')
                  if (isInRange(oddsData['o+1.5'])) availableTypes.push('Over 1.5')
                  if (isInRange(oddsData.odd_1x)) availableTypes.push('Double Chance')
                } else {
                  continue
                }

                let selectedType: string | null = null
                for (let i = 0; i < typeRotation.length; i++) {
                  const rotatedType = typeRotation[(typeIndex + i) % typeRotation.length]
                  if (availableTypes.includes(rotatedType)) {
                    selectedType = rotatedType
                    typeIndex = (typeIndex + i + 1) % typeRotation.length
                    break
                  }
                }
                if (!selectedType && availableTypes.length > 0) {
                  selectedType = availableTypes[0]
                } else if (!selectedType) {
                  continue
                }
                predictionType = selectedType
              } else {
                const isUsableOdd = (odd: string | undefined) => {
                  if (!odd) return false
                  const val = parseFloat(odd)
                  return Number.isFinite(val) && val > 1
                }
                if (selectedFilter === 'home_win' && isUsableOdd(oddsData?.odd_1)) {
                  availableTypes.push('Home Win')
                } else if (selectedFilter === 'away_win' && isUsableOdd(oddsData?.odd_2)) {
                  availableTypes.push('Away Win')
                } else if (selectedFilter === 'over_2_5' && isUsableOdd(oddsData?.['o+2.5'])) {
                  availableTypes.push('Over 2.5')
                } else if (selectedFilter === 'over_1_5' && isUsableOdd(oddsData?.['o+1.5'])) {
                  availableTypes.push('Over 1.5')
                } else if (selectedFilter === 'btts' && isUsableOdd(oddsData?.bts_yes)) {
                  availableTypes.push('BTTS')
                } else if (selectedFilter === 'double_chance' && isUsableOdd(oddsData?.odd_1x)) {
                  availableTypes.push('Double Chance')
                } else if (selectedFilter === 'super_single') {
                  if (oddsData) {
                    const validOptions = [
                      { type: 'Home Win', odd: parseFloat(oddsData.odd_1 || '0') },
                      { type: 'Away Win', odd: parseFloat(oddsData.odd_2 || '0') },
                      { type: 'Over 2.5', odd: parseFloat(oddsData['o+2.5'] || '0') },
                    ].filter(opt => Number.isFinite(opt.odd) && opt.odd > 1)
                    validOptions.sort((a, b) => b.odd - a.odd)
                    if (validOptions.length > 0) availableTypes.push(validOptions[0].type)
                  }
                }
                if (availableTypes.length > 0) {
                  predictionType = availableTypes[0]
                } else {
                  continue
                }
              }

              let odds = 0
              let confidence = 75
              if (oddsData) {
                if (predictionType === 'Home Win' && oddsData.odd_1) {
                  odds = parseFloat(oddsData.odd_1)
                } else if (predictionType === 'Away Win' && oddsData.odd_2) {
                  odds = parseFloat(oddsData.odd_2)
                } else if (predictionType === 'Over 2.5' && oddsData['o+2.5']) {
                  odds = parseFloat(oddsData['o+2.5'])
                } else if (predictionType === 'Over 1.5' && oddsData['o+1.5']) {
                  odds = parseFloat(oddsData['o+1.5'])
                } else if (predictionType === 'BTTS' && oddsData.bts_yes) {
                  odds = parseFloat(oddsData.bts_yes)
                } else if (predictionType === 'Double Chance' && oddsData.odd_1x) {
                  odds = parseFloat(oddsData.odd_1x)
                }
                confidence = Math.min(95, Math.max(60, 100 - (odds - 1) * 20))
              }

              if (!Number.isFinite(odds) || odds <= 1) continue

              allPredictions.push({
                id: `${fixture.match_id}-${predictionType}`,
                home_team: fixture.match_hometeam_name || 'Home Team',
                away_team: fixture.match_awayteam_name || 'Away Team',
                league: fixture.league_name || 'Unknown League',
                prediction_type: predictionType,
                odds,
                confidence,
                kickoff_time: `${fixture.match_date} ${fixture.match_time || '00:00'}`,
                status: fixture.match_status === 'Finished' ? 'finished' : fixture.match_live === '1' ? 'live' : 'not_started',
                home_team_logo: fixture.team_home_badge,
                away_team_logo: fixture.team_away_badge,
                home_score: fixture.match_hometeam_score || undefined,
                away_score: fixture.match_awayteam_score || undefined,
                match_id: fixture.match_id,
              })
            } catch {
              // skip bad fixture
            }
          }
        }

        let filteredPredictions = allPredictions.filter(p => Number.isFinite(p.odds) && p.odds > 1)
        if (selectedFilter === 'free') {
          const allowedTypes = ['Home Win', 'Away Win', 'Over 1.5', 'Double Chance']
          filteredPredictions = filteredPredictions.filter(p => allowedTypes.includes(p.prediction_type))
        }

        let finalPredictions: FreePrediction[]
        if (selectedFilter === 'free') {
          finalPredictions = filteredPredictions.length >= minPredictions
            ? filteredPredictions.slice(0, 5)
            : filteredPredictions
        } else {
          finalPredictions = filteredPredictions
        }

        setPredictions(finalPredictions)
      } catch {
        setPredictions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPredictions()
  }, [selectedFilter, dateType, customDate, daysBack])

  const getDateLabel = () => {
    if (dateType === 'today') return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (dateType === 'tomorrow') {
      const d = new Date(); d.setDate(d.getDate() + 1)
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
    if (dateType === 'previous') {
      const d = new Date(); d.setDate(d.getDate() - daysBack)
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
    if (dateType === 'custom' && customDate) {
      return new Date(customDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <section className="py-4 lg:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Mobile Filters */}
        <div className="mb-4 lg:hidden">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {FILTERS.map((filter, index) => {
              const isActive = selectedFilter === filter.id
              let colSpan = ''
              if (index === 3) colSpan = 'col-span-2'
              if (index === 8) colSpan = 'col-span-3'
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className={`relative inline-flex min-h-[44px] items-center justify-center rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${colSpan} ${
                    isActive
                      ? 'border-[#1e40af] bg-[#1e40af] text-white'
                      : 'border-[#1e40af] bg-white text-[#1e40af] hover:bg-[#1e40af] hover:text-white'
                  }`}
                >
                  <span className="absolute right-1 top-1 rounded-full bg-[#16a34a] px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white">
                    Free
                  </span>
                  {filter.label}
                </button>
              )
            })}
          </div>

          <p className="text-sm text-gray-600 mb-4">{getDateLabel()}</p>

          {/* Mobile date navigation */}
          <div className="flex items-center justify-center gap-1 bg-gray-100 p-1 rounded-lg mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'px-2 py-1.5 rounded-md text-xs font-medium transition-all justify-start text-left font-normal',
                    (customDate || dateType === 'custom') && 'bg-[#1e40af] text-white shadow-sm'
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
                    if (date) { setCustomDate(format(date, 'yyyy-MM-dd')); setDateType('custom'); setDaysBack(1) }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {(['previous', 'today', 'tomorrow'] as const).map((dt) => (
              <button
                key={dt}
                onClick={() => { setDateType(dt); setCustomDate(''); setDaysBack(1) }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  dateType === dt ? 'bg-[#1e40af] text-white shadow-sm' : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
                }`}
              >
                {loading && dateType === dt ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {dt === 'previous' ? 'Yesterday' : dt.charAt(0).toUpperCase() + dt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="mb-4 lg:mb-8 hidden lg:block">
          <div className="grid grid-cols-9 gap-2 mb-4">
            {FILTERS.map((filter) => {
              const isActive = selectedFilter === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => handleFilterChange(filter.id)}
                  className={`relative inline-flex min-h-12 items-center justify-center rounded-lg border px-2 lg:px-3 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? 'border-[#1e40af] bg-[#1e40af] text-white'
                      : 'border-[#1e40af] bg-white text-[#1e40af] hover:bg-[#1e40af] hover:text-white'
                  }`}
                >
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-[#16a34a] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    Free
                  </span>
                  {filter.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm lg:text-base text-gray-600">
              Expert predictions for {getDateLabel()}&apos;s matches
            </p>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-all justify-start text-left',
                      (customDate || dateType === 'custom') && 'bg-[#1e40af] text-white shadow-sm'
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
                      if (date) { setCustomDate(format(date, 'yyyy-MM-dd')); setDateType('custom'); setDaysBack(1) }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {(['previous', 'today', 'tomorrow'] as const).map((dt) => (
                <button
                  key={dt}
                  onClick={() => { setDateType(dt); setCustomDate(''); setDaysBack(1) }}
                  className={`flex items-center gap-1 px-3 lg:px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    dateType === dt ? 'bg-[#1e40af] text-white shadow-sm' : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
                  }`}
                >
                  {loading && dateType === dt ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {dt === 'previous' ? 'Yesterday' : dt.charAt(0).toUpperCase() + dt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <>
            <div className="lg:hidden space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-3 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-300 rounded" />
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-300 rounded" />
                      <div className="h-6 w-6 bg-gray-300 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 bg-gray-300 rounded" />
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-24 bg-gray-300 rounded" />
                      <div className="h-6 w-6 bg-gray-300 rounded-full" />
                    </div>
                  </div>
                  <div className="bg-[#1e40af] text-white px-3 py-2 rounded grid grid-cols-3 gap-2 text-xs font-semibold">
                    <div>Tip</div><div className="text-center">Odd</div><div className="text-center">Confidence</div>
                  </div>
                  <div className="bg-gray-200 px-3 py-2 rounded grid grid-cols-3 gap-2 items-center">
                    <div className="h-4 w-12 bg-gray-300 rounded" />
                    <div className="h-4 w-10 bg-gray-300 rounded mx-auto" />
                    <div className="h-8 w-8 bg-gray-300 rounded-full mx-auto" />
                  </div>
                </div>
              ))}
            </div>
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
                  <div className="col-span-2"><div className="h-4 w-16 bg-gray-200 rounded" /><div className="h-3 w-24 bg-gray-200 rounded mt-2" /></div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="h-6 w-6 bg-gray-200 rounded-full" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <span className="text-gray-400">vs</span>
                    <div className="h-6 w-6 bg-gray-200 rounded-full" />
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="col-span-1"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></div>
                  <div className="col-span-1"><div className="h-6 w-16 bg-gray-200 rounded mx-auto" /></div>
                  <div className="col-span-1"><div className="h-4 w-12 bg-gray-200 rounded mx-auto" /></div>
                  <div className="col-span-2 flex justify-center"><div className="h-12 w-12 bg-gray-200 rounded-full" /></div>
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{formatTime(prediction.kickoff_time)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.home_team}</span>
                      {prediction.home_team_logo ? (
                        <Image src={prediction.home_team_logo} alt={prediction.home_team} width={24} height={24} className="object-contain rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">{prediction.home_team.charAt(0)}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{prediction.league}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{prediction.away_team}</span>
                      {prediction.away_team_logo ? (
                        <Image src={prediction.away_team_logo} alt={prediction.away_team} width={24} height={24} className="object-contain rounded-full" unoptimized onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">{prediction.away_team.charAt(0)}</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#1e40af] text-white px-2 py-2 rounded grid grid-cols-5 gap-1 text-[10px] sm:text-xs font-semibold">
                    <div className="text-center">Status</div>
                    <div className="text-center">Tip</div>
                    <div className="text-center">Score</div>
                    <div className="text-center">Odd</div>
                    <div className="text-center">Conf</div>
                  </div>
                  <div className="bg-gray-200 px-2 py-2 rounded grid grid-cols-5 gap-1 items-center">
                    <div className="flex items-center justify-center">
                      <Badge variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'} className="text-[10px] px-1.5 py-0.5">
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
                        : prediction.status === 'finished' ? 'FT' : '-'}
                    </div>
                    <div className="text-[10px] font-semibold text-gray-900 text-center">{prediction.odds.toFixed(2)}</div>
                    <div className="flex items-center justify-center">
                      <CircularProgress value={prediction.confidence} size={40} strokeWidth={3} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-0 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-lg">
              <div className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white px-6 py-4 grid grid-cols-12 gap-4 items-center font-bold text-sm shadow-md">
                <div className="col-span-2">Time & League</div>
                <div className="col-span-4">Teams</div>
                <div className="col-span-1 text-center">Score</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-1 text-center">Tip</div>
                <div className="col-span-1 text-center">Odd</div>
                <div className="col-span-2 text-center">Confidence</div>
              </div>
              {predictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  onClick={() => {
                    const matchId = `${prediction.match_id}-${prediction.prediction_type}`
                    window.location.href = `/match/${encodeURIComponent(matchId)}`
                  }}
                  className={cn(
                    'px-6 py-5 grid grid-cols-12 gap-4 items-center border-b border-gray-100 bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-[1.01] hover:border-l-4 hover:border-l-[#22c55e]',
                    index === predictions.length - 1 && 'border-b-0',
                    index % 2 === 0 && 'bg-gray-50/50'
                  )}
                >
                  <div className="col-span-2">
                    <div className="text-sm font-medium text-gray-900">{formatTime(prediction.kickoff_time)}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{prediction.league}</div>
                  </div>
                  <div className="col-span-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {prediction.home_team_logo ? (
                        <Image src={prediction.home_team_logo} alt={prediction.home_team} width={24} height={24} className="object-contain flex-shrink-0" unoptimized onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">{prediction.home_team.charAt(0)}</div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">{prediction.home_team}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {prediction.away_team_logo ? (
                        <Image src={prediction.away_team_logo} alt={prediction.away_team} width={24} height={24} className="object-contain flex-shrink-0" unoptimized onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">{prediction.away_team.charAt(0)}</div>
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate">{prediction.away_team}</span>
                    </div>
                  </div>
                  <div className="col-span-1 text-center">
                    {prediction.status === 'finished' && prediction.home_score !== undefined && prediction.away_score !== undefined ? (
                      <div className="text-sm font-semibold text-gray-900">{prediction.home_score} - {prediction.away_score}</div>
                    ) : prediction.status === 'finished' ? (
                      <div className="text-xs font-semibold text-gray-600">FT</div>
                    ) : (
                      <div className="text-xs text-gray-400">-</div>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <Badge variant={prediction.status === 'finished' ? 'default' : prediction.status === 'live' ? 'destructive' : 'outline'} className="text-xs">
                      {prediction.status === 'finished' ? 'Finished' : prediction.status === 'live' ? 'Live' : 'Not Started'}
                    </Badge>
                  </div>
                  <div className="col-span-1 text-center">
                    <Badge variant="secondary" className="text-xs">
                      {prediction.prediction_type === 'Over 1.5' ? 'Ov 1.5' :
                       prediction.prediction_type === 'Over 2.5' ? 'Ov 2.5' :
                       prediction.prediction_type}
                    </Badge>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-semibold text-gray-900">{prediction.odds.toFixed(2)}</span>
                  </div>
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
