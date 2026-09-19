'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { todayKey } from '@/lib/utils/date'
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

/**
 * Market groupings offered in the UI. `markets` matches
 * `PredictionCandidate.market` in lib/predictions/generate.ts; `undefined`
 * means "consider everything and pick the best".
 */
const MARKET_GROUPS: Array<{ id: string; label: string; markets?: string[] }> = [
  { id: 'all', label: 'Best available (all markets)' },
  { id: 'result', label: 'Match result (1X2)', markets: ['home_win', 'away_win', 'draw'] },
  {
    id: 'double_chance',
    label: 'Double chance',
    markets: ['double_chance_1x', 'double_chance_x2', 'double_chance_12'],
  },
  {
    id: 'goals',
    label: 'Total goals (over/under)',
    markets: [
      'over_0_5', 'over_1_5', 'over_2_5', 'over_3_5',
      'under_0_5', 'under_1_5', 'under_2_5', 'under_3_5',
    ],
  },
  { id: 'btts', label: 'Both teams to score', markets: ['btts', 'btts_no'] },
  {
    id: 'first_half',
    label: 'First half',
    markets: [
      'ht_home_win', 'ht_draw', 'ht_away_win',
      'fh_over_0_5', 'fh_over_1_5', 'fh_under_0_5', 'fh_under_1_5',
    ],
  },
  {
    id: 'team_goals',
    label: 'Team goals',
    markets: [
      'home_over_0_5', 'home_over_1_5', 'home_under_0_5', 'home_under_1_5',
      'away_over_0_5', 'away_over_1_5', 'away_under_0_5', 'away_under_1_5',
    ],
  },
]

interface PreviewPrediction {
  plan_type: string
  prediction_date: string
  market?: string
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
  const planSlug = searchParams.get('plan') || 'daily-50-odds-combo'
  
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  // The admin's own today, not UTC's - otherwise the form opens on tomorrow
  // for anyone east of UTC late in the day.
  const [date, setDate] = useState(() => todayKey())
  // Confidence is now the vig-adjusted implied probability of the selection,
  // not a random number, so the useful range sits lower than it used to. 55%
  // is roughly an even-money shot.
  const [minConfidence, setMinConfidence] = useState([55])
  const [marketGroup, setMarketGroup] = useState<string>('all')
  const [perFixture, setPerFixture] = useState<string>('1')
  const [minOdds, setMinOdds] = useState<string>('') // Optional minimum odds
  const [maxOdds, setMaxOdds] = useState<string>('') // Optional maximum odds
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
      'daily-50-odds-combo': 'profit_multiplier',
      'profit-multiplier': 'profit_multiplier',
      'daily-2-odds': 'daily_2_odds',
      'standard': 'standard',
      'free': 'free',
      'correct-score': 'correct_score'
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
          minOdds: minOdds ? parseFloat(minOdds) : undefined,
          maxOdds: maxOdds ? parseFloat(maxOdds) : undefined,
          markets: MARKET_GROUPS.find((g) => g.id === marketGroup)?.markets,
          perFixture: parseInt(perFixture, 10),
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
        
        if (data.predictions.length === 0) {
          toast.info(
            `No selections met your filters. ${data.fixturesPriced} of ${data.fixturesConsidered} matches had odds` +
              (data.leaguesFailed ? ` (${data.leaguesFailed} leagues did not respond)` : '') +
              '. Try lowering the minimum confidence or widening the odds range.'
          )
        } else {
          toast.success(
            `Found ${data.predictions.length} predictions from ${data.fixturesPriced} priced matches` +
              (data.leaguesFailed ? ` (${data.leaguesFailed} leagues did not respond)` : '')
          )
        }
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
      // Fetch fixture, odds, H2H, and standings concurrently — none of these
      // depend on each other's results (odds/H2H/standings key off the
      // prediction's own match_id/team ids/league_id, not the fetched
      // fixture), so awaiting them one after another was needlessly summing
      // four provider round-trips into a 20+ second wait for this dialog.
      // kickoff_time is stored as "YYYY-MM-DD HH:MM:SS" in UTC; take the date
      // portion directly rather than going through Date (which parses
      // space-separated datetimes as local time and can shift the date for
      // matches near midnight UTC)
      const date = prediction.kickoff_time.split(' ')[0]

      const [fixtures, odds, h2hData, standingsData] = await Promise.all([
        getFixtures(date),
        getOdds(prediction.match_id).catch((oddsError) => {
          console.error('Error fetching odds:', oddsError)
          return [] as Odds[]
        }),
        prediction.home_team_id && prediction.away_team_id
          ? getH2H(prediction.home_team_id, prediction.away_team_id).catch((h2hError) => {
              console.error('Error fetching H2H:', h2hError)
              return null
            })
          : Promise.resolve(null),
        prediction.league_id
          ? getStandings(prediction.league_id).catch((standingsError) => {
              console.error('Error fetching standings:', standingsError)
              return [] as any[]
            })
          : Promise.resolve([] as any[]),
      ])

      const fixture = Array.isArray(fixtures)
        ? fixtures.find((f: any) => f.match_id === prediction.match_id)
        : null

      if (!fixture) {
        throw new Error('Fixture not found')
      }

      const oddsData: Odds | null = Array.isArray(odds) && odds.length > 0 ? odds[0] : null

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
                      min={40}
                      max={95}
                      step={5}
                      value={minConfidence[0]}
                      onChange={(e) => setMinConfidence([parseInt(e.target.value)])}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-slider"
                      style={{
                        background: `linear-gradient(to right, #1e40af 0%, #1e40af ${((minConfidence[0] - 40) / 55) * 100}%, #e5e7eb ${((minConfidence[0] - 40) / 55) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    <span>40%</span>
                    <span>67%</span>
                    <span>95%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only selections the bookmaker prices at <strong>{minConfidence[0]}%</strong> or better will be
                    included. This is the real implied probability with the bookmaker&apos;s margin removed, so a
                    higher setting returns fewer but shorter-priced tips.
                  </p>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label htmlFor="marketGroup">Prediction Markets</Label>
                  <select
                    id="marketGroup"
                    value={marketGroup}
                    onChange={(e) => setMarketGroup(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {MARKET_GROUPS.map((group) => (
                      <option key={group.id} value={group.id}>{group.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Leave on <strong>Best available</strong> to let each match contribute whichever market the odds
                    most support, or narrow it to a specific market.
                  </p>

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="perFixture" className="text-xs">Tips per match</Label>
                    <select
                      id="perFixture"
                      value={perFixture}
                      onChange={(e) => setPerFixture(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="1">1 - strongest selection only</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Label htmlFor="odds">Odds Filter (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minOdds" className="text-xs">Minimum Odds</Label>
                      <Input
                        id="minOdds"
                        type="number"
                        step="0.01"
                        min="1.0"
                        placeholder="e.g., 1.50"
                        value={minOdds}
                        onChange={(e) => setMinOdds(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only include predictions with odds &ge; this value
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxOdds" className="text-xs">Maximum Odds</Label>
                      <Input
                        id="maxOdds"
                        type="number"
                        step="0.01"
                        min="1.0"
                        placeholder="e.g., 3.00"
                        value={maxOdds}
                        onChange={(e) => setMaxOdds(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only include predictions with odds &le; this value
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to include all odds. Both filters can be used together to set a range.
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

