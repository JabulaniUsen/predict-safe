'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Navbar } from '@/components/layout/navbar'
import { Footer } from '@/components/layout/footer'
import { Fixture, getFixtures, TOP_LEAGUES, getLeagueName } from '@/lib/api-football'
import { RefreshCw, Clock, Trophy, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LiveScoresPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [filter, setFilter] = useState<'all' | 'live' | 'finished' | 'scheduled'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchLiveScores = useCallback(async () => {
    try {
      setRefreshing(true)
      const today = new Date().toISOString().split('T')[0]
      
      // Fetch today's matches
      const allMatches = await getFixtures(today, selectedLeague === 'all' ? undefined : selectedLeague, today)
      
      if (Array.isArray(allMatches)) {
        // Filter matches based on selected filter
        let filtered = allMatches
        
        if (filter === 'live') {
          filtered = allMatches.filter((match: any) => match.match_live === '1')
        } else if (filter === 'finished') {
          filtered = allMatches.filter((match: any) => 
            match.match_status === 'Finished' || match.match_status === 'FT'
          )
        } else if (filter === 'scheduled') {
          filtered = allMatches.filter((match: any) => 
            match.match_status === 'Not Started' || match.match_status === ''
          )
        }
        
        // Sort: live matches first, then by time
        filtered.sort((a: any, b: any) => {
          if (a.match_live === '1' && b.match_live !== '1') return -1
          if (a.match_live !== '1' && b.match_live === '1') return 1
          return new Date(`${a.match_date} ${a.match_time}`).getTime() - 
                 new Date(`${b.match_date} ${b.match_time}`).getTime()
        })
        
        setMatches(filtered)
      } else {
        setMatches([])
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error fetching live scores:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedLeague, filter])

  useEffect(() => {
    fetchLiveScores()
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchLiveScores()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [fetchLiveScores])

  const getStatusBadge = (match: any) => {
    if (match.match_live === '1') {
      return (
        <Badge className="bg-red-500 text-white animate-pulse">
          LIVE
        </Badge>
      )
    }
    
    if (match.match_status === 'Finished' || match.match_status === 'FT') {
      return (
        <Badge variant="secondary" className="bg-gray-500 text-white">
          FT
        </Badge>
      )
    }
    
    if (match.match_status === 'Half Time' || match.match_status === 'HT') {
      return (
        <Badge className="bg-yellow-500 text-white">
          HT
        </Badge>
      )
    }
    
    if (match.match_status && match.match_status !== 'Not Started' && match.match_status !== '') {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          {match.match_status}
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="border-gray-300 text-gray-600">
        {match.match_time || 'TBD'}
      </Badge>
    )
  }

  const getMatchScore = (match: any) => {
    const homeScore = match.match_hometeam_score || '0'
    const awayScore = match.match_awayteam_score || '0'
    
    if (match.match_live === '1' || match.match_status === 'Finished' || match.match_status === 'FT') {
      return (
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl font-bold">{homeScore}</span>
          <span className="text-gray-400">-</span>
          <span className="text-2xl sm:text-3xl font-bold">{awayScore}</span>
        </div>
      )
    }
    
    return (
      <div className="text-sm text-gray-500">
        {match.match_time || 'TBD'}
      </div>
    )
  }

  const liveMatchesCount = matches.filter((m: any) => m.match_live === '1').length

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-6 sm:py-8 lg:py-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
                  Live Scores
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  Real-time football match scores and updates
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={fetchLiveScores}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {lastUpdate && (
                  <span className="text-xs text-gray-500">
                    Updated: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            
            {liveMatchesCount > 0 && (
              <div className="flex items-center gap-2 text-red-600 font-semibold">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>{liveMatchesCount} {liveMatchesCount === 1 ? 'match' : 'matches'} live</span>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Status Filter */}
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                <TabsTrigger value="live" className="text-xs sm:text-sm">
                  Live
                  {liveMatchesCount > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {liveMatchesCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="text-xs sm:text-sm">Scheduled</TabsTrigger>
                <TabsTrigger value="finished" className="text-xs sm:text-sm">Finished</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* League Filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedLeague === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLeague('all')}
                className="text-xs sm:text-sm"
              >
                All Leagues
              </Button>
              {Object.entries(TOP_LEAGUES).map(([key, leagueId]) => (
                <Button
                  key={leagueId}
                  variant={selectedLeague === leagueId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeague(leagueId)}
                  className="text-xs sm:text-sm"
                >
                  {getLeagueName(leagueId)}
                </Button>
              ))}
            </div>
          </div>

          {/* Matches List */}
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#1e40af]" />
              <p className="text-gray-600">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">
                No matches found
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                {filter === 'live' 
                  ? 'No live matches at the moment. Check back later!'
                  : 'No matches found for the selected filters.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {matches.map((match: any) => (
                <Card 
                  key={match.match_id} 
                  className={`hover:shadow-lg transition-shadow cursor-pointer ${
                    match.match_live === '1' ? 'border-red-500 border-2' : ''
                  }`}
                  onClick={() => router.push(`/match/${match.match_id}`)}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* League Info */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {match.league_logo && (
                          <Image
                            src={match.league_logo}
                            alt={match.league_name}
                            width={24}
                            height={24}
                            className="rounded"
                          />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-semibold text-gray-900">
                            {match.league_name}
                          </span>
                          {match.match_round && (
                            <span className="text-xs text-gray-500">
                              {match.match_round}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Match Info */}
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          {match.team_home_badge ? (
                            <Image
                              src={match.team_home_badge}
                              alt={match.match_hometeam_name}
                              width={32}
                              height={32}
                              className="flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0"></div>
                          )}
                          <span className="text-sm sm:text-base font-medium text-gray-900 truncate">
                            {match.match_hometeam_name}
                          </span>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
                          {getMatchScore(match)}
                          {getStatusBadge(match)}
                          {match.match_hometeam_halftime_score && (
                            <span className="text-xs text-gray-500">
                              HT: {match.match_hometeam_halftime_score} - {match.match_awayteam_halftime_score}
                            </span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 justify-end sm:justify-start">
                          <span className="text-sm sm:text-base font-medium text-gray-900 truncate text-right sm:text-left">
                            {match.match_awayteam_name}
                          </span>
                          {match.team_away_badge ? (
                            <Image
                              src={match.team_away_badge}
                              alt={match.match_awayteam_name}
                              width={32}
                              height={32}
                              className="flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex-shrink-0"></div>
                          )}
                        </div>
                      </div>

                      {/* Match Time/Date */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{match.match_time || 'TBD'}</span>
                        </div>
                        {match.match_stadium && (
                          <span className="text-xs text-gray-400 truncate max-w-[120px] sm:max-w-none">
                            {match.match_stadium}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

