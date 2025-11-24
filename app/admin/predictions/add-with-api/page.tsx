'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminLayout } from '@/components/admin/admin-layout'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { Eye, Loader2 } from 'lucide-react'
import { getFixtures, getOdds, getStandings, getH2H, Fixture, Odds, H2HData } from '@/lib/api-football'
import Image from 'next/image'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

interface PreviewPrediction {
  plan_type: string
  home_team: string
  away_team: string
  league: string
  prediction_type: string
  odds: number
  confidence: number
  kickoff_time: string
  status: string
  match_id?: string
  league_id?: string
  home_team_id?: string
  away_team_id?: string
}

function AddPredictionWithAPIContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan') || 'profit-multiplier'
  
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [minConfidence, setMinConfidence] = useState([70]) // Default minimum confidence: 70%
  const [previewPredictions, setPreviewPredictions] = useState<PreviewPrediction[]>([])
  const [selectedPredictions, setSelectedPredictions] = useState<Set<number>>(new Set())
  const [selectedGameIndex, setSelectedGameIndex] = useState<number | null>(null)
  const [gameDetails, setGameDetails] = useState<{
    fixture: Fixture | null
    odds: Odds | null
    h2h: H2HData | null
    standings: any[]
    loading: boolean
  }>({
    fixture: null,
    odds: null,
    h2h: null,
    standings: [],
    loading: false,
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      const typedUserProfile = userProfile as UserProfile | null

      if (!typedUserProfile?.is_admin) {
        router.push('/dashboard')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  // Map plan slug to plan_type
  const getPlanTypeFromSlug = (slug: string): string => {
    const mapping: Record<string, string> = {
      'profit-multiplier': 'profit_multiplier',
      'daily-2-odds': 'daily_2_odds',
      'standard': 'standard',
      'free': 'free'
    }
    return mapping[slug] || 'profit_multiplier'
  }

  const handleSyncPredictions = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setPreviewPredictions([])
    setSelectedPredictions(new Set())

    try {
      const planType = getPlanTypeFromSlug(planSlug)
      const response = await fetch('/api/football/sync-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          planType,
          minConfidence: minConfidence[0],
          preview: true, // Enable preview mode
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch predictions')
      }

      if (data.predictions && Array.isArray(data.predictions)) {
        setPreviewPredictions(data.predictions)
        // Select all by default
        setSelectedPredictions(new Set(data.predictions.map((_: any, index: number) => index)))
        
        const message = data.filtered > 0
          ? `Found ${data.predictions.length} predictions! ${data.filtered} predictions were filtered out (confidence < ${data.minConfidence}%)`
          : `Found ${data.predictions.length} predictions!`
        
        toast.success(message)
      } else {
        toast.info('No predictions found for the selected date')
      }
    } catch (error: any) {
      console.error('Error fetching predictions:', error)
      toast.error(error.message || 'Failed to fetch predictions')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedPredictions.size === previewPredictions.length) {
      setSelectedPredictions(new Set())
    } else {
      setSelectedPredictions(new Set(previewPredictions.map((_, index) => index)))
    }
  }

  const handleToggleSelection = (index: number) => {
    const newSelected = new Set(selectedPredictions)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedPredictions(newSelected)
  }

  const handleUpdateSelected = async () => {
    if (selectedPredictions.size === 0) {
      toast.error('Please select at least one prediction to update')
      return
    }

    setUpdating(true)

    try {
      const predictionsToInsert = Array.from(selectedPredictions).map(index => previewPredictions[index])
      
      const response = await fetch('/api/football/insert-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          predictions: predictionsToInsert,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to insert predictions')
      }

      toast.success(`Successfully inserted ${data.synced || 0} predictions!`)
      router.push('/admin/predictions')
    } catch (error: any) {
      console.error('Error inserting predictions:', error)
      toast.error(error.message || 'Failed to insert predictions')
      setUpdating(false)
    }
  }

  const handleViewGameDetails = async (index: number) => {
    const prediction = previewPredictions[index]
    if (!prediction.match_id) {
      toast.error('Match ID not available for this game')
      return
    }

    setSelectedGameIndex(index)
    setGameDetails({
      fixture: null,
      odds: null,
      h2h: null,
      standings: [],
      loading: true,
    })

    try {
      // Fetch fixture details
      const date = new Date(prediction.kickoff_time).toISOString().split('T')[0]
      const fixtures = await getFixtures(date)
      const fixture = Array.isArray(fixtures) 
        ? fixtures.find((f: any) => f.match_id === prediction.match_id)
        : null

      if (!fixture) {
        throw new Error('Fixture not found')
      }

      // Fetch odds
      let oddsData: Odds | null = null
      try {
        const odds = await getOdds(prediction.match_id)
        if (Array.isArray(odds) && odds.length > 0) {
          oddsData = odds[0]
        }
      } catch (oddsError) {
        console.error('Error fetching odds:', oddsError)
      }

      // Fetch H2H if team IDs are available
      let h2hData: H2HData | null = null
      if (prediction.home_team_id && prediction.away_team_id) {
        try {
          h2hData = await getH2H(prediction.home_team_id, prediction.away_team_id)
        } catch (h2hError) {
          console.error('Error fetching H2H:', h2hError)
        }
      }

      // Fetch standings if league ID is available
      let standingsData: any[] = []
      if (prediction.league_id) {
        try {
          standingsData = await getStandings(prediction.league_id)
        } catch (standingsError) {
          console.error('Error fetching standings:', standingsError)
        }
      }

      setGameDetails({
        fixture: fixture as Fixture,
        odds: oddsData,
        h2h: h2hData,
        standings: standingsData,
        loading: false,
      })
    } catch (error: any) {
      console.error('Error fetching game details:', error)
      toast.error(error.message || 'Failed to fetch game details')
      setGameDetails(prev => ({ ...prev, loading: false }))
    }
  }

  if (checkingAuth) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Add Predictions with API</h1>
            <p className="text-sm lg:text-base text-muted-foreground">
              Sync predictions from API Football for {planSlug.replace('-', ' ')}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()} size="sm" className="text-xs lg:text-sm">
            Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base lg:text-lg">Sync Predictions</CardTitle>
            <CardDescription className="text-xs lg:text-sm">
              Fetch predictions from API Football for the selected date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSyncPredictions} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Select the date for which you want to sync predictions
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="confidence">Minimum Confidence Level</Label>
                    <span className="text-sm font-semibold text-[#1e40af]">{minConfidence[0]}%</span>
                  </div>
                  <div className="relative">
                    <input
                      id="confidence"
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={minConfidence[0]}
                      onChange={(e) => setMinConfidence([parseInt(e.target.value)])}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                      style={{
                        background: `linear-gradient(to right, #1e40af 0%, #1e40af ${((minConfidence[0] - 50) / 50) * 100}%, #e5e7eb ${((minConfidence[0] - 50) / 50) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only predictions with confidence level of <strong>{minConfidence[0]}%</strong> or higher will be synced
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Fetching Predictions...' : 'Fetch Predictions'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {previewPredictions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base lg:text-lg">Preview Predictions</CardTitle>
                  <CardDescription className="text-xs lg:text-sm">
                    Review and select predictions to insert ({selectedPredictions.size} of {previewPredictions.length} selected)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedPredictions.size === previewPredictions.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleUpdateSelected}
                    disabled={updating || selectedPredictions.size === 0}
                  >
                    {updating ? 'Updating...' : `Update Selected (${selectedPredictions.size})`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedPredictions.size === previewPredictions.length && previewPredictions.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>League</TableHead>
                      <TableHead>Prediction</TableHead>
                      <TableHead>Odds</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Kickoff</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewPredictions.map((prediction, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPredictions.has(index)}
                            onCheckedChange={() => handleToggleSelection(index)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {prediction.home_team} vs {prediction.away_team}
                        </TableCell>
                        <TableCell>{prediction.league}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{prediction.prediction_type}</Badge>
                        </TableCell>
                        <TableCell>{prediction.odds.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={prediction.confidence >= 80 ? 'default' : 'secondary'}>
                            {prediction.confidence}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(prediction.kickoff_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewGameDetails(index)}
                            disabled={!prediction.match_id}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            See
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Details Dialog */}
        <Dialog open={selectedGameIndex !== null} onOpenChange={(open) => !open && setSelectedGameIndex(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Game Details</DialogTitle>
              <DialogDescription>
                Analyze the game before adding to predictions
              </DialogDescription>
            </DialogHeader>
            
            {gameDetails.loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading game details...</span>
              </div>
            ) : gameDetails.fixture ? (
              <div className="space-y-6">
                {/* Match Header */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                  <div className="flex items-center gap-4 flex-1">
                    {gameDetails.fixture.team_home_badge && (
                      <Image
                        src={gameDetails.fixture.team_home_badge}
                        alt={gameDetails.fixture.match_hometeam_name}
                        width={60}
                        height={60}
                        className="object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <div className="flex-1 text-center">
                      <div className="text-lg font-semibold">{gameDetails.fixture.match_hometeam_name}</div>
                      <div className="text-sm text-muted-foreground">vs</div>
                      <div className="text-lg font-semibold">{gameDetails.fixture.match_awayteam_name}</div>
                    </div>
                    {gameDetails.fixture.team_away_badge && (
                      <Image
                        src={gameDetails.fixture.team_away_badge}
                        alt={gameDetails.fixture.match_awayteam_name}
                        width={60}
                        height={60}
                        className="object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                  </div>
                </div>

                {/* Match Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Match Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><span className="font-medium">League:</span> {gameDetails.fixture.league_name}</div>
                      <div><span className="font-medium">Country:</span> {gameDetails.fixture.country_name}</div>
                      <div><span className="font-medium">Date:</span> {gameDetails.fixture.match_date}</div>
                      <div><span className="font-medium">Time:</span> {gameDetails.fixture.match_time}</div>
                      {gameDetails.fixture.match_stadium && (
                        <div><span className="font-medium">Stadium:</span> {gameDetails.fixture.match_stadium}</div>
                      )}
                      {gameDetails.fixture.match_referee && (
                        <div><span className="font-medium">Referee:</span> {gameDetails.fixture.match_referee}</div>
                      )}
                      <div><span className="font-medium">Status:</span> {gameDetails.fixture.match_status}</div>
                    </div>
                  </div>

                  {/* Odds */}
                  {gameDetails.odds && (
                    <div>
                      <h3 className="font-semibold mb-2">Available Odds</h3>
                      <div className="space-y-1 text-sm">
                        {gameDetails.odds.odd_1 && (
                          <div><span className="font-medium">Home Win:</span> {gameDetails.odds.odd_1}</div>
                        )}
                        {gameDetails.odds.odd_x && (
                          <div><span className="font-medium">Draw:</span> {gameDetails.odds.odd_x}</div>
                        )}
                        {gameDetails.odds.odd_2 && (
                          <div><span className="font-medium">Away Win:</span> {gameDetails.odds.odd_2}</div>
                        )}
                        {gameDetails.odds['o+1.5'] && (
                          <div><span className="font-medium">Over 1.5:</span> {gameDetails.odds['o+1.5']}</div>
                        )}
                        {gameDetails.odds['o+2.5'] && (
                          <div><span className="font-medium">Over 2.5:</span> {gameDetails.odds['o+2.5']}</div>
                        )}
                        {gameDetails.odds.bts_yes && (
                          <div><span className="font-medium">BTTS Yes:</span> {gameDetails.odds.bts_yes}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* H2H */}
                {gameDetails.h2h && (
                  <div>
                    <h3 className="font-semibold mb-2">Head to Head</h3>
                    {gameDetails.h2h.firstTeam_VS_secondTeam && gameDetails.h2h.firstTeam_VS_secondTeam.length > 0 ? (
                      <div className="text-sm space-y-1">
                        <p className="font-medium mb-2">Recent meetings:</p>
                        {gameDetails.h2h.firstTeam_VS_secondTeam.slice(0, 5).map((match: any, idx: number) => (
                          <div key={idx} className="border-b pb-1">
                            {match.match_hometeam_name} {match.match_hometeam_score} - {match.match_awayteam_score} {match.match_awayteam_name}
                            <span className="text-muted-foreground ml-2">({match.match_date})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No H2H data available</p>
                    )}
                  </div>
                )}

                {/* Standings */}
                {gameDetails.standings.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">League Standings</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Pos</th>
                            <th className="text-left p-2">Team</th>
                            <th className="text-center p-2">P</th>
                            <th className="text-center p-2">W</th>
                            <th className="text-center p-2">D</th>
                            <th className="text-center p-2">L</th>
                            <th className="text-center p-2">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gameDetails.standings.slice(0, 10).map((team: any, idx: number) => (
                            <tr 
                              key={idx} 
                              className={`border-b ${
                                team.team_id === gameDetails.fixture?.match_hometeam_id || 
                                team.team_id === gameDetails.fixture?.match_awayteam_id
                                  ? 'bg-blue-50' 
                                  : ''
                              }`}
                            >
                              <td className="p-2">{team.overall_league_position}</td>
                              <td className="p-2 font-medium">{team.team_name}</td>
                              <td className="p-2 text-center">{team.overall_league_payed}</td>
                              <td className="p-2 text-center">{team.overall_league_W}</td>
                              <td className="p-2 text-center">{team.overall_league_D}</td>
                              <td className="p-2 text-center">{team.overall_league_L}</td>
                              <td className="p-2 text-center font-semibold">{team.overall_league_PTS}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Selected Prediction Info */}
                {selectedGameIndex !== null && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Selected Prediction</h3>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Type:</span> {previewPredictions[selectedGameIndex].prediction_type}</div>
                      <div><span className="font-medium">Odds:</span> {previewPredictions[selectedGameIndex].odds.toFixed(2)}</div>
                      <div><span className="font-medium">Confidence:</span> {previewPredictions[selectedGameIndex].confidence}%</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Failed to load game details
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default function AddPredictionWithAPIPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    }>
      <AddPredictionWithAPIContent />
    </Suspense>
  )
}

