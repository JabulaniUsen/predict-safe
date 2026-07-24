'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { TeamSelector } from '@/components/admin/team-selector'
import { LeagueSelector } from '@/components/admin/league-selector'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>
type MatchStatus = 'not_started' | 'finished'

interface CorrectScorePredictionRow {
  prediction_type: string | null
  odds: number | null
  kickoff_time: string | null
  status: string | null
  home_score: number | null
  away_score: number | null
  admin_notes: string | null
  league: string | null
  league_id: string | null
  home_team: string | null
  away_team: string | null
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function determineCorrectScoreResult(scorePrediction: string, homeScore: number, awayScore: number): 'win' | 'loss' {
  const [predictedHome, predictedAway] = scorePrediction.split('-').map((score) => Number(score.trim()))

  if (Number.isNaN(predictedHome) || Number.isNaN(predictedAway)) {
    return 'loss'
  }

  return predictedHome === homeScore && predictedAway === awayScore ? 'win' : 'loss'
}

function AddCorrectScoreContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit') || ''
  const isEditMode = !!editId

  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loadingPrediction, setLoadingPrediction] = useState(isEditMode)
  const [leagueId, setLeagueId] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [formData, setFormData] = useState({
    score_prediction: '',
    odds: '',
    kickoff_date: '',
    kickoff_time: '',
    match_status: 'not_started' as MatchStatus,
    home_score: '',
    away_score: '',
    admin_notes: '',
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

  // Load prediction data if editing
  useEffect(() => {
    const loadPrediction = async () => {
      if (!isEditMode || checkingAuth) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('predictions')
          .select('*')
          .eq('id', editId)
          .single()

        if (error) throw error
        if (!data) {
          toast.error('Prediction not found')
          router.push('/admin/predictions')
          return
        }

        const prediction = data as CorrectScorePredictionRow

        // Extract score from prediction_type (just the score, e.g., "2-1")
        const score = prediction.prediction_type || ''

        // Set form data
        const kickoffDateTime = prediction.kickoff_time ? new Date(prediction.kickoff_time) : null
        setFormData({
          score_prediction: score,
          odds: prediction.odds?.toString() || '',
          kickoff_date: kickoffDateTime ? kickoffDateTime.toISOString().slice(0, 10) : '',
          kickoff_time: kickoffDateTime ? kickoffDateTime.toISOString().slice(11, 16) : '',
          match_status: prediction.status === 'finished' ? 'finished' : 'not_started',
          home_score: prediction.home_score !== null && prediction.home_score !== undefined ? prediction.home_score.toString() : '',
          away_score: prediction.away_score !== null && prediction.away_score !== undefined ? prediction.away_score.toString() : '',
          admin_notes: prediction.admin_notes || '',
        })

        // Set league and teams
        setLeagueName(prediction.league || '')
        setLeagueId(prediction.league_id || '')
        setHomeTeam(prediction.home_team || '')
        setAwayTeam(prediction.away_team || '')

        setLoadingPrediction(false)
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'Failed to load prediction'))
        router.push('/admin/predictions')
      }
    }

    loadPrediction()
  }, [isEditMode, editId, checkingAuth, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formDataObj = new FormData(e.currentTarget)
    const scorePrediction = formDataObj.get('score_prediction') as string
    const matchStatus = formDataObj.get('match_status') as MatchStatus
    const homeScoreValue = formDataObj.get('home_score') as string
    const awayScoreValue = formDataObj.get('away_score') as string
    const homeScore = homeScoreValue === '' ? null : Number(homeScoreValue)
    const awayScore = awayScoreValue === '' ? null : Number(awayScoreValue)

    if (matchStatus === 'finished') {
      if (homeScore === null || awayScore === null || Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        toast.error('Enter the actual score before marking the game as finished')
        setLoading(false)
        return
      }
    }

    // Combine date and time into ISO datetime string
    const kickoffDate = formDataObj.get('kickoff_date') as string
    const kickoffTime = formDataObj.get('kickoff_time') as string
    const kickoffDateTime = `${kickoffDate}T${kickoffTime}:00`

    const predictionData: Record<string, unknown> = {
      plan_type: 'correct_score', // Use correct_score as plan_type
      home_team: (homeTeam || formDataObj.get('home_team')) as string,
      away_team: (awayTeam || formDataObj.get('away_team')) as string,
      league: (leagueName || formDataObj.get('league')) as string,
      league_id: leagueId || null,
      prediction_type: scorePrediction, // Just the score (e.g., "2-1")
      odds: formDataObj.get('odds') ? parseFloat(formDataObj.get('odds') as string) : 1.0,
      confidence: 80, // Default confidence for correct score predictions
      kickoff_time: kickoffDateTime,
      status: matchStatus,
      home_score: matchStatus === 'finished' ? homeScore : null,
      away_score: matchStatus === 'finished' ? awayScore : null,
      result: matchStatus === 'finished' && homeScore !== null && awayScore !== null
        ? determineCorrectScoreResult(scorePrediction, homeScore, awayScore)
        : null,
      admin_notes: (formDataObj.get('admin_notes') as string) || null,
    }

    try {
      const supabase = createClient()

      if (isEditMode) {
        const { error } = await supabase
          .from('predictions')
          // @ts-expect-error - Supabase type inference issue
          .update(predictionData)
          .eq('id', editId)

        if (error) throw error
        toast.success('Correct score prediction updated successfully!')
        
        // Notify users subscribed to this plan (non-blocking)
        try {
          await fetch('/api/notifications/notify-prediction-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ planType: predictionData.plan_type }),
          })
        } catch (notifyError) {
          console.error('Error notifying users:', notifyError)
          // Don't fail the request if notification fails
        }
      } else {
        const { error } = await supabase
          .from('predictions')
          // @ts-expect-error - Supabase type inference issue
          .insert(predictionData)
        if (error) throw error
        toast.success('Correct score prediction added successfully!')
        
        // Notify users subscribed to this plan (non-blocking)
        try {
          await fetch('/api/notifications/notify-prediction-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ planType: predictionData.plan_type }),
          })
        } catch (notifyError) {
          console.error('Error notifying users:', notifyError)
          // Don't fail the request if notification fails
        }
      }

      router.push('/admin/predictions')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, `Failed to ${isEditMode ? 'update' : 'add'} prediction`))
      setLoading(false)
    }
  }

  if (checkingAuth || loadingPrediction) {
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
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Correct Score Prediction' : 'Add Correct Score Prediction'}</h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update the correct score prediction details' : 'Fill in the details for the correct score prediction'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Correct Score Details</CardTitle>
            <CardDescription>Enter all required information for the correct score prediction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="league">League *</Label>
                <LeagueSelector
                  value={leagueId}
                  onValueChange={(id, name) => {
                    setLeagueId(id)
                    setLeagueName(name)
                    setHomeTeam('')
                    setAwayTeam('')
                  }}
                  placeholder="Select league..."
                />
                <input type="hidden" name="league" value={leagueName} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="home_team">Home Team *</Label>
                  <TeamSelector
                    value={homeTeam}
                    onValueChange={setHomeTeam}
                    placeholder={leagueId ? "Select home team..." : "Select league first"}
                    leagueId={leagueId}
                  />
                  <input type="hidden" name="home_team" value={homeTeam} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="away_team">Away Team *</Label>
                  <TeamSelector
                    value={awayTeam}
                    onValueChange={setAwayTeam}
                    placeholder={leagueId ? "Select away team..." : "Select league first"}
                    leagueId={leagueId}
                  />
                  <input type="hidden" name="away_team" value={awayTeam} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score_prediction">Score Prediction *</Label>
                  <Input
                    name="score_prediction"
                    placeholder="e.g., 2-1"
                    required
                    value={formData.score_prediction}
                    onChange={(e) => setFormData({ ...formData, score_prediction: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="odds">Odds (Optional)</Label>
                  <Input
                    name="odds"
                    type="number"
                    step="0.01"
                    value={formData.odds}
                    onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kickoff_date">Kickoff Date *</Label>
                  <Input
                    name="kickoff_date"
                    type="date"
                    required
                    value={formData.kickoff_date}
                    onChange={(e) => setFormData({ ...formData, kickoff_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kickoff_time">Kickoff Time (24h format: HH:MM) *</Label>
                  <Input
                    name="kickoff_time"
                    type="text"
                    pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                    placeholder="14:30"
                    required
                    value={formData.kickoff_time}
                    onChange={(e) => setFormData({ ...formData, kickoff_time: e.target.value })}
                    title="Enter time in 24-hour format (HH:MM), e.g., 14:30 or 19:45"
                  />
                  <p className="text-xs text-muted-foreground">Format: HH:MM (e.g., 14:30, 19:45)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="match_status">Game Status *</Label>
                  <Select
                    name="match_status"
                    value={formData.match_status}
                    onValueChange={(value: MatchStatus) =>
                      setFormData({
                        ...formData,
                        match_status: value,
                        home_score: value === 'finished' ? formData.home_score : '',
                        away_score: value === 'finished' ? formData.away_score : '',
                      })
                    }
                  >
                    <SelectTrigger id="match_status" className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Finished</SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="home_score">Home Score</Label>
                  <Input
                    id="home_score"
                    name="home_score"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    required={formData.match_status === 'finished'}
                    disabled={formData.match_status !== 'finished'}
                    value={formData.home_score}
                    onChange={(e) => setFormData({ ...formData, home_score: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="away_score">Away Score</Label>
                  <Input
                    id="away_score"
                    name="away_score"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    required={formData.match_status === 'finished'}
                    disabled={formData.match_status !== 'finished'}
                    value={formData.away_score}
                    onChange={(e) => setFormData({ ...formData, away_score: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                <Textarea
                  name="admin_notes"
                  rows={4}
                  value={formData.admin_notes}
                  onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Correct Score' : 'Add Correct Score')}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default function AddCorrectScorePage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    }>
      <AddCorrectScoreContent />
    </Suspense>
  )
}
