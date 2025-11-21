'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CircularProgress } from '@/components/ui/circular-progress'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils/date'
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
        // Fetch fixture details
        const fixtures = await getFixtures(undefined, undefined, undefined)
        const match = Array.isArray(fixtures)
          ? fixtures.find((f: any) => f.match_id === matchId)
          : null

        if (match) {
          setFixture(match as Fixture)

          // Fetch odds
          try {
            const oddsData = await getOdds(matchId)
            if (Array.isArray(oddsData) && oddsData.length > 0) {
              setOdds(oddsData[0])
              
              // Set selected prediction based on predictionType
              if (predictionType) {
                let tip = ''
                let odd = 0
                let prob = 0

                if (predictionType === 'Home Win' && oddsData[0].odd_1) {
                  tip = 'Home Win'
                  odd = parseFloat(oddsData[0].odd_1)
                } else if (predictionType === 'Away Win' && oddsData[0].odd_2) {
                  tip = 'Away Win'
                  odd = parseFloat(oddsData[0].odd_2)
                } else if (predictionType === 'Over 1.5' && oddsData[0]['o+1.5']) {
                  tip = 'Ov 1.5'
                  odd = parseFloat(oddsData[0]['o+1.5'])
                } else if (predictionType === 'Over 2.5' && oddsData[0]['o+2.5']) {
                  tip = 'Ov 2.5'
                  odd = parseFloat(oddsData[0]['o+2.5'])
                } else if (predictionType === 'BTTS' && oddsData[0].bts_yes) {
                  tip = 'BTTS'
                  odd = parseFloat(oddsData[0].bts_yes)
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
        <Button onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="mt-8 text-center">
          <p className="text-muted-foreground">Match not found</p>
        </div>
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => router.back()} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Match Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{league}</CardTitle>
              <div className="text-sm text-muted-foreground">
                {formatDate(new Date(`${matchDate} ${matchTime || '00:00'}`))} • {matchTime || '00:00'}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Prediction Banner */}
            {selectedPrediction && (
              <div className="mb-6 bg-red-500 text-white px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <span className="font-semibold">Tip: {selectedPrediction.tip}</span>
                  <span className="font-semibold">Odd: {selectedPrediction.odd.toFixed(2)}</span>
                  <span className="font-semibold">Prob.: {selectedPrediction.prob}%</span>
                </div>
              </div>
            )}

            {/* Teams */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 text-center">
                <div className="flex justify-center mb-2">
                  {homeLogo ? (
                    <Image
                      src={homeLogo}
                      alt={homeTeam}
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold">
                      {homeTeam.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="font-semibold text-lg mb-2">{homeTeam}</div>
                <div className="flex justify-center gap-1">
                  {homeLast5.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        result === 'W'
                          ? 'bg-green-500 text-white'
                          : result === 'L'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mx-8 text-2xl font-bold text-gray-400">VS</div>

              <div className="flex-1 text-center">
                <div className="flex justify-center mb-2">
                  {awayLogo ? (
                    <Image
                      src={awayLogo}
                      alt={awayTeam}
                      width={64}
                      height={64}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold">
                      {awayTeam.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="font-semibold text-lg mb-2">{awayTeam}</div>
                <div className="flex justify-center gap-1">
                  {awayLast5.map((result, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        result === 'W'
                          ? 'bg-green-500 text-white'
                          : result === 'L'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-400 text-white'
                      }`}
                    >
                      {result}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground mb-6">LAST 5 MATCHES</div>

            {/* Betting Odds */}
            {odds && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Home Win</div>
                    <div className="text-2xl font-bold">{odds.odd_1 || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Draw</div>
                    <div className="text-2xl font-bold">{odds.odd_x || 'N/A'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-sm text-muted-foreground mb-1">Away Win</div>
                    <div className="text-2xl font-bold">{odds.odd_2 || 'N/A'}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Head to Head History */}
        {h2hMatches.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>HEAD TO HEAD HISTORY</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {h2hMatches.map((match: any) => {
                  const homeScore = parseInt(match.match_hometeam_score || '0')
                  const awayScore = parseInt(match.match_awayteam_score || '0')
                  const isHomeWin = homeScore > awayScore
                  const isAwayWin = awayScore > homeScore

                  return (
                    <div
                      key={match.match_id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="text-sm text-muted-foreground">
                        {formatDate(new Date(match.match_date))}
                      </div>
                      <div className="flex items-center gap-3 flex-1 justify-center">
                        <div className="flex items-center gap-2">
                          {match.team_home_badge ? (
                            <Image
                              src={match.team_home_badge}
                              alt={match.match_hometeam_name}
                              width={24}
                              height={24}
                              className="object-contain"
                              unoptimized
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                              {match.match_hometeam_name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm">{match.match_hometeam_name}</span>
                        </div>
                        <span className="font-semibold">
                          {match.match_hometeam_score} - {match.match_awayteam_score}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{match.match_awayteam_name}</span>
                          {match.team_away_badge ? (
                            <Image
                              src={match.team_away_badge}
                              alt={match.match_awayteam_name}
                              width={24}
                              height={24}
                              className="object-contain"
                              unoptimized
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
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
            <Card>
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle>{homeTeam} - Last 5 Matches</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {homeTeamMatches.slice(0, 5).map((match: any) => {
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
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(match.match_date))}
                        </div>
                        <div className="flex items-center gap-3 flex-1 justify-center">
                          <div className="flex items-center gap-2">
                            {match.team_home_badge ? (
                              <Image
                                src={match.team_home_badge}
                                alt={match.match_hometeam_name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                {match.match_hometeam_name.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm">{match.match_hometeam_name}</span>
                          </div>
                          <span className="font-semibold">
                            {match.match_hometeam_score} - {match.match_awayteam_score}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{match.match_awayteam_name}</span>
                            {match.team_away_badge ? (
                              <Image
                                src={match.team_away_badge}
                                alt={match.match_awayteam_name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                {match.match_awayteam_name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            result === 'W'
                              ? 'bg-green-500 text-white'
                              : result === 'L'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-400 text-white'
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
            <Card>
              <CardHeader className="bg-blue-600 text-white">
                <CardTitle>{awayTeam} - Last 5 Matches</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {awayTeamMatches.slice(0, 5).map((match: any) => {
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
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(match.match_date))}
                        </div>
                        <div className="flex items-center gap-3 flex-1 justify-center">
                          <div className="flex items-center gap-2">
                            {match.team_home_badge ? (
                              <Image
                                src={match.team_home_badge}
                                alt={match.match_hometeam_name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                {match.match_hometeam_name.charAt(0)}
                              </div>
                            )}
                            <span className="text-sm">{match.match_hometeam_name}</span>
                          </div>
                          <span className="font-semibold">
                            {match.match_hometeam_score} - {match.match_awayteam_score}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{match.match_awayteam_name}</span>
                            {match.team_away_badge ? (
                              <Image
                                src={match.team_away_badge}
                                alt={match.match_awayteam_name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                                {match.match_awayteam_name.charAt(0)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            result === 'W'
                              ? 'bg-green-500 text-white'
                              : result === 'L'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-400 text-white'
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
          <Card>
            <CardHeader className="bg-blue-600 text-white">
              <CardTitle>{league} Standings</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">P</th>
                      <th className="text-left py-2 px-4">Team</th>
                      <th className="text-center py-2 px-4">M</th>
                      <th className="text-center py-2 px-4">W</th>
                      <th className="text-center py-2 px-4">GD</th>
                      <th className="text-center py-2 px-4">P</th>
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
                          className={isHighlighted ? 'bg-orange-100' : ''}
                        >
                          <td className="py-2 px-4 font-medium">{team.overall_league_position}</td>
                          <td className="py-2 px-4">{team.team_name}</td>
                          <td className="py-2 px-4 text-center">{team.overall_league_payed}</td>
                          <td className="py-2 px-4 text-center">{team.overall_league_W}</td>
                          <td className="py-2 px-4 text-center">{goalsDiff > 0 ? '+' : ''}{goalsDiff}</td>
                          <td className="py-2 px-4 text-center font-bold">{team.overall_league_PTS}</td>
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
    </div>
  )
}

