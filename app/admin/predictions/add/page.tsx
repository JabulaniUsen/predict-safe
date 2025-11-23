'use client'

import { useState, useEffect } from 'react'
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
import { Prediction } from '@/types'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default function AddPredictionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan') || ''
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
    prediction_type: '',
    odds: '',
    confidence: '',
    kickoff_time: '',
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

        const prediction = data as Prediction

        // Set form data
        setFormData({
          prediction_type: prediction.prediction_type || '',
          odds: prediction.odds?.toString() || '',
          confidence: prediction.confidence?.toString() || '',
          kickoff_time: prediction.kickoff_time ? new Date(prediction.kickoff_time).toISOString().slice(0, 16) : '',
          admin_notes: prediction.admin_notes || '',
        })

        // Set league and teams
        setLeagueName(prediction.league || '')
        setHomeTeam(prediction.home_team || '')
        setAwayTeam(prediction.away_team || '')

        setLoadingPrediction(false)
      } catch (error: any) {
        toast.error(error.message || 'Failed to load prediction')
        router.push('/admin/predictions')
      }
    }

    loadPrediction()
  }, [isEditMode, editId, checkingAuth, router])

  // Map plan slug to plan_type
  const getPlanTypeFromSlug = (slug: string): string => {
    const mapping: Record<string, string> = {
      'profit-multiplier': 'profit_multiplier',
      'daily-2-odds': 'daily_2_odds',
      'standard': 'standard',
      'free': 'free'
    }
    return mapping[slug] || 'standard'
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formDataObj = new FormData(e.currentTarget)
    const planType = planSlug 
      ? getPlanTypeFromSlug(planSlug)
      : (formDataObj.get('plan_type') as string)
    
    const baseData = {
      plan_type: planType as 'profit_multiplier' | 'daily_2_odds' | 'standard' | 'free',
      home_team: (homeTeam || formDataObj.get('home_team')) as string,
      away_team: (awayTeam || formDataObj.get('away_team')) as string,
      league: (leagueName || formDataObj.get('league')) as string,
      prediction_type: formDataObj.get('prediction_type') as string,
      odds: parseFloat(formDataObj.get('odds') as string),
      confidence: parseInt(formDataObj.get('confidence') as string),
      kickoff_time: formDataObj.get('kickoff_time') as string,
      admin_notes: (formDataObj.get('admin_notes') as string) || null,
    }

    try {
      const supabase = createClient()
      
      if (isEditMode) {
        const updateData: Database['public']['Tables']['predictions']['Update'] = baseData
        const { error } = await supabase
          .from('predictions')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', editId)

        if (error) throw error
        toast.success('Prediction updated successfully!')
      } else {
        const insertData: Database['public']['Tables']['predictions']['Insert'] = baseData
        const { error } = await supabase
          .from('predictions')
          // @ts-expect-error - Supabase type inference issue
          .insert(insertData)
        if (error) throw error
        toast.success('Prediction added successfully!')
      }
      
      router.push('/admin/predictions')
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'add'} prediction`)
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
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Prediction' : 'Add New Prediction'}</h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update the prediction details' : 'Fill in the details for the new prediction'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Prediction Details</CardTitle>
            <CardDescription>Enter all required information for the prediction</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {planSlug && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Adding prediction for: <strong>{planSlug.replace('-', ' ')}</strong>
                  </p>
                </div>
              )}
              {!planSlug && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan_type">Plan Type *</Label>
                    <Select name="plan_type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="profit_multiplier">Profit Multiplier</SelectItem>
                        <SelectItem value="daily_2_odds">Daily 2 Odds</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prediction_type">Prediction Type *</Label>
                    <Input name="prediction_type" placeholder="e.g., Over 2.5, Home Win" required />
                  </div>
                </div>
              )}
              {planSlug && (
                <div className="space-y-2">
                  <Label htmlFor="prediction_type">Prediction Type *</Label>
                  <Input 
                    name="prediction_type" 
                    placeholder="e.g., Over 2.5, Home Win" 
                    required 
                    value={formData.prediction_type}
                    onChange={(e) => setFormData({ ...formData, prediction_type: e.target.value })}
                  />
                </div>
              )}

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
                  <Label htmlFor="odds">Odds *</Label>
                  <Input 
                    name="odds" 
                    type="number" 
                    step="0.01" 
                    required 
                    value={formData.odds}
                    onChange={(e) => setFormData({ ...formData, odds: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confidence">Confidence (%) *</Label>
                  <Input 
                    name="confidence" 
                    type="number" 
                    min="0" 
                    max="100" 
                    required 
                    value={formData.confidence}
                    onChange={(e) => setFormData({ ...formData, confidence: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kickoff_time">Kickoff Time *</Label>
                <Input 
                  name="kickoff_time" 
                  type="datetime-local" 
                  required 
                  value={formData.kickoff_time}
                  onChange={(e) => setFormData({ ...formData, kickoff_time: e.target.value })}
                />
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
                  {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Prediction' : 'Add Prediction')}
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

