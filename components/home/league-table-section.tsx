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
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 text-[#1e40af]">League Tables</h2>
          <p className="text-gray-600">Current standings for top European leagues</p>
        </div>
        <Card className="border-2 border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] text-white">
            <CardTitle className="text-2xl">Top 5 Leagues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeLeague} onValueChange={setActiveLeague}>
              <TabsList className="grid w-full grid-cols-5 bg-gray-100 p-1 m-4 rounded-lg">
                <TabsTrigger value={TOP_LEAGUES.PREMIER_LEAGUE} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold">Premier League</TabsTrigger>
                <TabsTrigger value={TOP_LEAGUES.LA_LIGA} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold">La Liga</TabsTrigger>
                <TabsTrigger value={TOP_LEAGUES.SERIE_A} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold">Serie A</TabsTrigger>
                <TabsTrigger value={TOP_LEAGUES.BUNDESLIGA} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold">Bundesliga</TabsTrigger>
                <TabsTrigger value={TOP_LEAGUES.LIGUE_1} className="data-[state=active]:bg-[#1e40af] data-[state=active]:text-white font-semibold">Ligue 1</TabsTrigger>
              </TabsList>
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
                            <TableHead className="w-12 font-bold text-white">Pos</TableHead>
                            <TableHead className="font-bold text-white">Team</TableHead>
                            <TableHead className="text-center font-bold text-white">MP</TableHead>
                            <TableHead className="text-center font-bold text-white">W</TableHead>
                            <TableHead className="text-center font-bold text-white">D</TableHead>
                            <TableHead className="text-center font-bold text-white">L</TableHead>
                            <TableHead className="text-center font-bold text-white">GD</TableHead>
                            <TableHead className="text-center font-bold text-white">Pts</TableHead>
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
                                  <TableCell className="font-bold text-[#1e40af]">{team.overall_league_position}</TableCell>
                                  <TableCell className="flex items-center gap-2 font-semibold">
                                    {team.team_badge && (
                                      <img src={team.team_badge} alt={team.team_name} className="w-6 h-6" />
                                    )}
                                    {team.team_name}
                                  </TableCell>
                                  <TableCell className="text-center font-medium">{team.overall_league_payed}</TableCell>
                                  <TableCell className="text-center font-medium text-[#22c55e]">{team.overall_league_W}</TableCell>
                                  <TableCell className="text-center font-medium">{team.overall_league_D}</TableCell>
                                  <TableCell className="text-center font-medium text-red-500">{team.overall_league_L}</TableCell>
                                  <TableCell className="text-center font-semibold">{goalsDiff > 0 ? '+' : ''}{goalsDiff}</TableCell>
                                  <TableCell className="text-center font-bold text-lg text-[#1e40af]">{team.overall_league_PTS}</TableCell>
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

