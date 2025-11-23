'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getStandings, TOP_LEAGUES, getLeagueName, Standing } from '@/lib/api-football'

export function LeagueTableSection() {
  const [standings, setStandings] = useState<Record<string, Standing[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeLeague, setActiveLeague] = useState(TOP_LEAGUES.PREMIER_LEAGUE)

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true)
      const leagues = Object.values(TOP_LEAGUES)
      const standingsData: Record<string, Standing[]> = {}

      try {
        await Promise.all(
          leagues.map(async (leagueId) => {
            try {
              const data = await getStandings(leagueId)
              // Ensure data is an array
              if (Array.isArray(data)) {
                standingsData[leagueId] = data
              } else if (data && typeof data === 'object') {
                // Try to extract array from response object
                const arrayData = Object.values(data).find((val: any) => Array.isArray(val))
                standingsData[leagueId] = Array.isArray(arrayData) ? arrayData : []
              } else {
                standingsData[leagueId] = []
              }
            } catch (error) {
              console.error(`Error fetching standings for ${leagueId}:`, error)
              standingsData[leagueId] = []
            }
          })
        )

        setStandings(standingsData)
      } catch (error) {
        console.error('Error fetching standings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStandings()
  }, [])

  const currentStandings = standings[activeLeague] || []

  return (
    <section className="py-8 lg:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-4 lg:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 lg:mb-2 text-[#1e40af]">League Tables</h2>
          <p className="text-sm lg:text-base text-gray-600">Current standings for top European leagues</p>
        </div>
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white p-4 lg:p-6">
            <CardTitle className="text-lg lg:text-2xl">Top 5 Leagues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeLeague} onValueChange={setActiveLeague}>
              <div className="overflow-x-auto px-2 lg:px-4 pt-4">
                <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 rounded-lg min-w-[500px] lg:min-w-0">
                  <TabsTrigger value={TOP_LEAGUES.PREMIER_LEAGUE} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold text-xs lg:text-sm px-1 lg:px-2">Premier League</TabsTrigger>
                  <TabsTrigger value={TOP_LEAGUES.LA_LIGA} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold text-xs lg:text-sm px-1 lg:px-2">La Liga</TabsTrigger>
                  <TabsTrigger value={TOP_LEAGUES.SERIE_A} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold text-xs lg:text-sm px-1 lg:px-2">Serie A</TabsTrigger>
                  <TabsTrigger value={TOP_LEAGUES.BUNDESLIGA} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold text-xs lg:text-sm px-1 lg:px-2">Bundesliga</TabsTrigger>
                  <TabsTrigger value={TOP_LEAGUES.LIGUE_1} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold text-xs lg:text-sm px-1 lg:px-2">Ligue 1</TabsTrigger>
                </TabsList>
              </div>
              {Object.values(TOP_LEAGUES).map((leagueId) => (
                <TabsContent key={leagueId} value={leagueId} className="m-0">
                  {loading ? (
                    <div className="py-12 text-center">Loading standings...</div>
                  ) : currentStandings.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      No standings available
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-[#1e40af] text-white hover:bg-[#1e3a8a]">
                            <TableHead className="w-8 lg:w-12 font-bold text-white text-xs lg:text-sm">Pos</TableHead>
                            <TableHead className="font-bold text-white text-xs lg:text-sm">Team</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm">MP</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm">W</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm">D</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm">L</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm hidden sm:table-cell">GD</TableHead>
                            <TableHead className="text-center font-bold text-white text-xs lg:text-sm">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(currentStandings) && currentStandings.length > 0 ? (
                            currentStandings.slice(0, 20).map((team: Standing, index: number) => {
                              const goalsDiff = parseInt(team.overall_league_GF || '0') - parseInt(team.overall_league_GA || '0')
                              return (
                                <TableRow 
                                  key={team.team_id}
                                  className={`hover:bg-gradient-to-r hover:from-blue-50 hover:to-green-50 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-[1.01] ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                  }`}
                                >
                                  <TableCell className="font-bold text-[#1e40af] text-xs lg:text-sm">{team.overall_league_position}</TableCell>
                                  <TableCell className="flex items-center gap-1 lg:gap-2 font-semibold text-xs lg:text-sm">
                                    {team.team_badge && (
                                      <img src={team.team_badge} alt={team.team_name} className="w-4 h-4 lg:w-6 lg:h-6" />
                                    )}
                                    <span className="truncate">{team.team_name}</span>
                                  </TableCell>
                                  <TableCell className="text-center font-medium text-xs lg:text-sm">{team.overall_league_payed}</TableCell>
                                  <TableCell className="text-center font-medium text-[#22c55e] text-xs lg:text-sm">{team.overall_league_W}</TableCell>
                                  <TableCell className="text-center font-medium text-xs lg:text-sm">{team.overall_league_D}</TableCell>
                                  <TableCell className="text-center font-medium text-red-500 text-xs lg:text-sm">{team.overall_league_L}</TableCell>
                                  <TableCell className="text-center font-semibold text-xs lg:text-sm hidden sm:table-cell">{goalsDiff > 0 ? '+' : ''}{goalsDiff}</TableCell>
                                  <TableCell className="text-center font-bold text-base lg:text-lg text-[#1e40af]">{team.overall_league_PTS}</TableCell>
                                </TableRow>
                              )
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                No standings data available
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

