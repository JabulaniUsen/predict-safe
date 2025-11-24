'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CircularProgress } from '@/components/ui/circular-progress'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatTime, getDateRange } from '@/lib/utils/date'
import { getFixtures, getOdds, getStandings, getH2H, TOP_LEAGUES } from '@/lib/api-football'
import { Fixture, H2HData } from '@/lib/api-football'

interface MatchDetailProps {
  matchId: string
  predictionType?: string
}

interface H2HMatch {
  match_id: string
  match_date: string
  match_hometeam_name: string
  match_awayteam_name: string
  match_hometeam_score: string
  match_awayteam_score: string
  team_home_badge?: string
  team_away_badge?: string
  result?: 'W' | 'L' | 'D'
}

export function MatchDetail({ matchId, predictionType }: MatchDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [fixture, setFixture] = useState<Fixture | null>(null)
  const [odds, setOdds] = useState<any>(null)
  const [h2hMatches, setH2hMatches] = useState<H2HMatch[]>([])
  const [homeTeamMatches, setHomeTeamMatches] = useState<H2HMatch[]>([])
  const [awayTeamMatches, setAwayTeamMatches] = useState<H2HMatch[]>([])
  const [standings, setStandings] = useState<any[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null)

  useEffect(() => {
    const fetchMatchData = async () => {
      setLoading(true)
      try {
        // Fetch fixture details - search across yesterday, today, and tomorrow
        let match: Fixture | null = null
        
        // Try fetching for previous, today, and tomorrow
        const dateTypes: Array<'previous' | 'today' | 'tomorrow'> = ['previous', 'today', 'tomorrow']
        
        for (const dateType of dateTypes) {
          try {
            const { from, to } = getDateRange(dateType)
            const fixtures = await getFixtures(from, undefined, to)
            
            if (Array.isArray(fixtures)) {
              const foundMatch = fixtures.find((f: any) => String(f.match_id) === String(matchId))
              if (foundMatch) {
                match = foundMatch as Fixture
                break
              }
            }
          } catch (error) {
            console.error(`Error fetching fixtures for ${dateType}:`, error)
            // Continue to next date range
          }
        }

        if (match) {
          setFixture(match as Fixture)

          // Fetch odds
          try {
            const oddsData = await getOdds(matchId)
            if (Array.isArray(oddsData) && oddsData.length > 0) {
              const matchOdds = oddsData[0] as any // API returns flat odds object
              setOdds(matchOdds)
              
              // Set selected prediction based on predictionType
              if (predictionType) {
                let tip = ''
                let odd = 0
                let prob = 0

                if (predictionType === 'Home Win' && matchOdds.odd_1) {
                  tip = 'Home Win'
                  odd = parseFloat(matchOdds.odd_1)
                } else if (predictionType === 'Away Win' && matchOdds.odd_2) {
                  tip = 'Away Win'
                  odd = parseFloat(matchOdds.odd_2)
                } else if (predictionType === 'Over 1.5' && matchOdds['o+1.5']) {
                  tip = 'Ov 1.5'
                  odd = parseFloat(matchOdds['o+1.5'])
                } else if (predictionType === 'Over 2.5' && matchOdds['o+2.5']) {
                  tip = 'Ov 2.5'
                  odd = parseFloat(matchOdds['o+2.5'])
                } else if (predictionType === 'BTTS' && matchOdds.bts_yes) {
                  tip = 'BTTS'
                  odd = parseFloat(matchOdds.bts_yes)
                }

                prob = Math.min(95, Math.max(60, 100 - (odd - 1) * 20))
                setSelectedPrediction({ tip, odd, prob })
              }
            }
          } catch (oddsError) {
            console.error('Error fetching odds:', oddsError)
          }

          // Fetch H2H data
          const homeTeamId = (match as any).match_hometeam_id
          const awayTeamId = (match as any).match_awayteam_id
          const leagueId = (match as any).league_id

          if (homeTeamId && awayTeamId) {
            try {
              const h2hData = await getH2H(homeTeamId, awayTeamId)
              if (h2hData && typeof h2hData === 'object') {
                // H2H matches
                if (Array.isArray(h2hData.firstTeam_VS_secondTeam)) {
                  setH2hMatches(h2hData.firstTeam_VS_secondTeam.slice(0, 10))
                }
                // Home team recent matches
                if (Array.isArray(h2hData.firstTeam_lastResults)) {
                  setHomeTeamMatches(h2hData.firstTeam_lastResults.slice(0, 5))
                }
                // Away team recent matches
                if (Array.isArray(h2hData.secondTeam_lastResults)) {
                  setAwayTeamMatches(h2hData.secondTeam_lastResults.slice(0, 5))
                }
              }
            } catch (h2hError) {
              console.error('Error fetching H2H data:', h2hError)
            }
          }

          // Fetch standings
          if (leagueId) {
            try {
              const leagueStandings = await getStandings(leagueId)
              if (Array.isArray(leagueStandings)) {
                setStandings(leagueStandings)
              }
            } catch (standingsError) {
              console.error('Error fetching standings:', standingsError)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching match data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMatchData()
  }, [matchId, predictionType])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!fixture) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Match not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const homeTeam = (fixture as any).match_hometeam_name
  const awayTeam = (fixture as any).match_awayteam_name
  const homeLogo = (fixture as any).team_home_badge
  const awayLogo = (fixture as any).team_away_badge
  const league = (fixture as any).league_name
  const matchDate = (fixture as any).match_date
  const matchTime = (fixture as any).match_time

  // Get last 5 results for teams
  const getLast5Results = (matches: H2HMatch[], teamId: string) => {
    return matches
      .slice(0, 5)
      .map((match: any) => {
        const isHomeTeam = match.match_hometeam_id === teamId
        const homeScore = parseInt(match.match_hometeam_score || '0')
        const awayScore = parseInt(match.match_awayteam_score || '0')

        if (homeScore > awayScore) {
          return isHomeTeam ? 'W' : 'L'
        } else if (awayScore > homeScore) {
          return isHomeTeam ? 'L' : 'W'
        } else {
          return 'D'
        }
      })
      .reverse()
  }

  const homeTeamId = (fixture as any).match_hometeam_id
  const awayTeamId = (fixture as any).match_awayteam_id
  const homeLast5 = getLast5Results(homeTeamMatches, homeTeamId)
  const awayLast5 = getLast5Results(awayTeamMatches, awayTeamId)

  return (
    <div className="container mx-auto px-4 py-8">
      <Button onClick={() => router.back()} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      {/* Match Header */}
      <Card className="mb-6 shadow-lg border-2 border-gray-200">
        <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <CardTitle className="text-xl sm:text-2xl">{league}</CardTitle>
            <div className="text-sm sm:text-base text-white/90">
              {formatDate(new Date(`${matchDate} ${matchTime || '00:00'}`))} • {matchTime || '00:00'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Prediction Banner */}
          {selectedPrediction && (
            <div className="mb-6 bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-4 py-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base">Tip:</span>
                  <Badge className="bg-white text-[#f97316] font-bold text-sm sm:text-base px-3 py-1">
                    {selectedPrediction.tip}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base">Odd:</span>
                  <span className="font-bold text-lg sm:text-xl">{selectedPrediction.odd.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm sm:text-base">Probability:</span>
                  <div className="flex items-center gap-2">
                    <CircularProgress value={selectedPrediction.prob} size={40} strokeWidth={4} />
                    <span className="font-bold text-lg sm:text-xl">{selectedPrediction.prob}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

            {/* Teams */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-6 sm:gap-4">
              <div className="flex-1 text-center w-full sm:w-auto">
                <div className="flex justify-center mb-3">
                  {homeLogo ? (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                      <Image
                        src={homeLogo}
                        alt={homeTeam}
                        width={96}
                        height={96}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md">
                      {homeTeam.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="font-bold text-lg sm:text-xl mb-3 text-gray-900">{homeTeam}</div>
                <div className="flex justify-center gap-1.5">
                  {homeLast5.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        result === 'W'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : result === 'L'
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-4 sm:mx-8 text-2xl sm:text-3xl font-bold text-gray-400">VS</div>

              <div className="flex-1 text-center w-full sm:w-auto">
                <div className="flex justify-center mb-3">
                  {awayLogo ? (
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
                      <Image
                        src={awayLogo}
                        alt={awayTeam}
                        width={96}
                        height={96}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-3xl sm:text-4xl font-bold shadow-md">
                      {awayTeam.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="font-bold text-lg sm:text-xl mb-3 text-gray-900">{awayTeam}</div>
                <div className="flex justify-center gap-1.5">
                  {awayLast5.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                        result === 'W'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : result === 'L'
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center text-xs sm:text-sm text-muted-foreground mb-6 font-semibold uppercase tracking-wide">Last 5 Matches</div>

            {/* Betting Odds */}
            {odds && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card className="border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2 font-medium">Home Win</div>
                    <div className="text-2xl sm:text-3xl font-bold text-[#1e40af]">{odds.odd_1 || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2 font-medium">Draw</div>
                    <div className="text-2xl sm:text-3xl font-bold text-gray-700">{odds.odd_x || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 pb-6 text-center">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-2 font-medium">Away Win</div>
                    <div className="text-2xl sm:text-3xl font-bold text-[#1e40af]">{odds.odd_2 || 'N/A'}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Head to Head History */}
        {h2hMatches.length > 0 && (
          <Card className="mb-6 shadow-lg border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
              <CardTitle className="text-lg sm:text-xl">Head to Head History</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                {h2hMatches.map((match: any, index: number) => {
                  const homeScore = parseInt(match.match_hometeam_score || '0')
                  const awayScore = parseInt(match.match_awayteam_score || '0')
                  const isHomeWin = homeScore > awayScore
                  const isAwayWin = awayScore > homeScore

                  return (
                    <div
                      key={match.match_id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-3 rounded-lg border border-gray-100 ${
                        index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      } hover:bg-blue-50 transition-colors`}
                    >
                      <div className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-0">
                        {formatDate(new Date(match.match_date))}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          {match.team_home_badge ? (
                            <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                              <Image
                                src={match.team_home_badge}
                                alt={match.match_hometeam_name}
                                width={28}
                                height={28}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                              {match.match_hometeam_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_hometeam_name}</span>
                        </div>
                        <span className="font-bold text-sm sm:text-base text-gray-900 px-2">
                          {match.match_hometeam_score} - {match.match_awayteam_score}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_awayteam_name}</span>
                          {match.team_away_badge ? (
                            <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                              <Image
                                src={match.team_away_badge}
                                alt={match.match_awayteam_name}
                                width={28}
                                height={28}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                              {match.match_awayteam_name.charAt(0)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Recent Matches */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {homeTeamMatches.length > 0 && (
            <Card className="shadow-lg border-2 border-gray-200">
              <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
                <CardTitle className="text-base sm:text-lg">{homeTeam} - Last 5 Matches</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {homeTeamMatches.slice(0, 5).map((match: any, index: number) => {
                    const isHomeTeam = match.match_hometeam_id === homeTeamId
                    const homeScore = parseInt(match.match_hometeam_score || '0')
                    const awayScore = parseInt(match.match_awayteam_score || '0')
                    let result: 'W' | 'L' | 'D' = 'D'
                    if (homeScore > awayScore) {
                      result = isHomeTeam ? 'W' : 'L'
                    } else if (awayScore > homeScore) {
                      result = isHomeTeam ? 'L' : 'W'
                    }

                    return (
                      <div
                        key={match.match_id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-3 rounded-lg border border-gray-100 ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition-colors`}
                      >
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-0">
                          {formatDate(new Date(match.match_date))}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            {match.team_home_badge ? (
                              <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                                <Image
                                  src={match.team_home_badge}
                                  alt={match.match_hometeam_name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                {match.match_hometeam_name.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_hometeam_name}</span>
                          </div>
                          <span className="font-bold text-sm sm:text-base text-gray-900 px-2">
                            {match.match_hometeam_score} - {match.match_awayteam_score}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_awayteam_name}</span>
                            {match.team_away_badge ? (
                              <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                                <Image
                                  src={match.team_away_badge}
                                  alt={match.match_awayteam_name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                {match.match_awayteam_name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                            result === 'W'
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                              : result === 'L'
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                          }`}
                        >
                          {result}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {awayTeamMatches.length > 0 && (
            <Card className="shadow-lg border-2 border-gray-200">
              <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
                <CardTitle className="text-base sm:text-lg">{awayTeam} - Last 5 Matches</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {awayTeamMatches.slice(0, 5).map((match: any, index: number) => {
                    const isHomeTeam = match.match_hometeam_id === awayTeamId
                    const homeScore = parseInt(match.match_hometeam_score || '0')
                    const awayScore = parseInt(match.match_awayteam_score || '0')
                    let result: 'W' | 'L' | 'D' = 'D'
                    if (homeScore > awayScore) {
                      result = isHomeTeam ? 'W' : 'L'
                    } else if (awayScore > homeScore) {
                      result = isHomeTeam ? 'L' : 'W'
                    }

                    return (
                      <div
                        key={match.match_id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 px-3 rounded-lg border border-gray-100 ${
                          index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                        } hover:bg-blue-50 transition-colors`}
                      >
                        <div className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-0">
                          {formatDate(new Date(match.match_date))}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center w-full sm:w-auto">
                          <div className="flex items-center gap-2">
                            {match.team_home_badge ? (
                              <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                                <Image
                                  src={match.team_home_badge}
                                  alt={match.match_hometeam_name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                {match.match_hometeam_name.charAt(0)}
                              </div>
                            )}
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_hometeam_name}</span>
                          </div>
                          <span className="font-bold text-sm sm:text-base text-gray-900 px-2">
                            {match.match_hometeam_score} - {match.match_awayteam_score}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{match.match_awayteam_name}</span>
                            {match.team_away_badge ? (
                              <div className="relative w-6 h-6 sm:w-7 sm:h-7">
                                <Image
                                  src={match.team_away_badge}
                                  alt={match.match_awayteam_name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                  unoptimized
                                />
                              </div>
                            ) : (
                              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">
                                {match.match_awayteam_name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                            result === 'W'
                              ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                              : result === 'L'
                              ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                          }`}
                        >
                          {result}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* League Standings */}
        {standings.length > 0 && (
          <Card className="shadow-lg border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white rounded-t-lg">
              <CardTitle className="text-lg sm:text-xl">{league} Standings</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">P</th>
                      <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Team</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">M</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">W</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">GD</th>
                      <th className="text-center py-3 px-4 text-sm font-bold text-gray-700">P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((team: any, idx: number) => {
                      const isHighlighted =
                        team.team_id === homeTeamId ||
                        team.team_id === awayTeamId
                      const goalsDiff =
                        parseInt(team.overall_league_GF || '0') -
                        parseInt(team.overall_league_GA || '0')

                      return (
                        <tr
                          key={team.team_id}
                          className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                            isHighlighted ? 'bg-gradient-to-r from-orange-50 to-orange-100 font-semibold' : ''
                          } ${idx % 2 === 0 && !isHighlighted ? 'bg-gray-50' : ''}`}
                        >
                          <td className="py-3 px-4 font-medium">{team.overall_league_position}</td>
                          <td className="py-3 px-4">{team.team_name}</td>
                          <td className="py-3 px-4 text-center">{team.overall_league_payed}</td>
                          <td className="py-3 px-4 text-center">{team.overall_league_W}</td>
                          <td className="py-3 px-4 text-center">{goalsDiff > 0 ? '+' : ''}{goalsDiff}</td>
                          <td className="py-3 px-4 text-center font-bold text-[#1e40af]">{team.overall_league_PTS}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  )
}

