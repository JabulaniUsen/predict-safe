'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, getDateRange, parseDateKey, toDateKey } from '@/lib/utils/date'
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

const ROUTE_BUTTONS = FILTERS.filter((filter) => filter.id !== 'free')

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
  const [predictions, setPredictions] = useState<FreePrediction[]>([])
  const selectedFilter: string = 'free'
  const [dateType, setDateType] = useState<'previous' | 'today' | 'tomorrow' | 'custom'>('today')
  const [customDate, setCustomDate] = useState<string>('')
  const [daysBack, setDaysBack] = useState<number>(1) // 1 = yesterday when dateType is 'previous'
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchPredictions = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const { from } = getDateRange(dateType, customDate, daysBack)

        // The picks are built and stored once on the server for each
        // (date, filter). Every device gets that same stored set, instead of
        // each browser assembling its own from the odds provider - which is
        // what made the same date show a different number of games on
        // different phones, and change again on refresh.
        const response = await fetch(
          `/api/predictions/free?date=${encodeURIComponent(from)}&filter=${encodeURIComponent(selectedFilter)}`
        )
        if (!response.ok) throw new Error(`Request failed: ${response.status}`)

        const data = await response.json()
        if (cancelled) return

        setPredictions(Array.isArray(data.picks) ? data.picks : [])
      } catch (error) {
        console.error('Error fetching free predictions:', error)
        if (cancelled) return
        // Surface the failure rather than rendering an empty list, which reads
        // as "no games today" when it actually means "we could not load them".
        setLoadError(true)
        setPredictions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPredictions()
    return () => {
      cancelled = true
    }
  }, [selectedFilter, dateType, customDate, daysBack, retryToken])

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
      return formatDate(parseDateKey(customDate))
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
      return parseDateKey(customDate)
    }
    return new Date()
  }

  return (
    <section className="py-4 lg:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Mobile Header */}
        <div className="mb-4 lg:hidden">
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
                  {customDate ? format(parseDateKey(customDate), 'MMM dd') : 'Select Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate ? parseDateKey(customDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setCustomDate(format(date, 'yyyy-MM-dd'))
                      setDateType('custom')
                      setDaysBack(1)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => {
                setDateType('previous')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'previous'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'previous' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Yesterday
            </button>
            <button
              onClick={() => {
                setDateType('today')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'today' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Today
            </button>
            <button
              onClick={() => {
                setDateType('tomorrow')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'tomorrow'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'tomorrow' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Tomorrow
            </button>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="mb-4 lg:mb-8 hidden lg:block">
        </div>

        <div className="mb-4 lg:mb-8 hidden lg:flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af]">{getFilterLabel()}</h2>
          <p className="text-sm lg:text-base text-gray-600">
            Get expert predictions for {getCurrentDate().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}&apos;s matches
          </p>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all justify-start text-left",
                    !customDate && dateType !== 'custom' && "text-gray-600 hover:text-[#1e40af] hover:bg-white",
                    (customDate || dateType === 'custom') && "bg-[#1e40af] text-white shadow-sm"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDate ? format(parseDateKey(customDate), 'MMM dd') : 'Select Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customDate ? parseDateKey(customDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setCustomDate(format(date, 'yyyy-MM-dd'))
                      setDateType('custom')
                      setDaysBack(1)
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => {
                setDateType('previous')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'previous'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'previous' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Yesterday
            </button>
            <button
              onClick={() => {
                setDateType('today')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'today'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'today' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Today
            </button>
            <button
              onClick={() => {
                setDateType('tomorrow')
                setCustomDate('')
                setDaysBack(1)
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${dateType === 'tomorrow'
                  ? 'bg-[#1e40af] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#1e40af] hover:bg-white'
              }`}
            >
              {loading && dateType === 'tomorrow' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
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
        ) : loadError ? (
          // "Couldn't load" and "nothing scheduled" are different things, and
          // showing the latter for the former is what made the site look like
          // it had no games when the request had simply failed.
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">
                We couldn&apos;t load predictions right now.
              </p>
              <Button variant="outline" onClick={() => setRetryToken((n) => n + 1)}>
                Try again
              </Button>
            </CardContent>
          </Card>
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

        <div className="mt-6 lg:mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
            {ROUTE_BUTTONS.map((item) => (
              <Link
                key={item.id}
                href={`/tips/${item.slug}`}
                className="relative inline-flex min-h-[48px] sm:min-h-[52px] items-center justify-center rounded-lg border border-[#1e40af] bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#1e40af] transition-colors hover:bg-[#1e40af] hover:text-white"
              >
                <span className="absolute right-1.5 top-1.5 rounded-full bg-[#16a34a] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Free
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
