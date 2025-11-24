'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminLayout } from '@/components/admin/admin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { ArrowLeft } from 'lucide-react'
import { LeagueSelector } from '@/components/admin/league-selector'
import { TeamSelector } from '@/components/admin/team-selector'

type VIPWinningInsert = Database['public']['Tables']['vip_winnings']['Insert']

interface AddVIPWinPageProps {
  plans: any[]
}

export default function AddVIPWinPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const [form, setForm] = useState({
    plan_id: '',
    plan_name: '',
    league_id: '',
    league_name: '',
    home_team: '',
    away_team: '',
    prediction_type: '',
    result: 'win' as 'win' | 'loss',
    date: new Date().toISOString().split('T')[0],
  })

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('plans')
        .select('*')
        .order('created_at')
      if (data) {
        setPlans(data)
      }
    }
    fetchPlans()
  }, [])

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find((p) => p.id === planId)
    setForm({
      ...form,
      plan_id: planId,
      plan_name: selectedPlan?.name || '',
    })
  }

  const handleLeagueChange = (leagueId: string, leagueName: string) => {
    setForm({
      ...form,
      league_id: leagueId,
      league_name: leagueName,
      // Reset teams when league changes
      home_team: '',
      away_team: '',
    })
  }

  const handleSave = async () => {
    if (!form.plan_name || !form.home_team || !form.away_team || !form.date) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      const insertData: VIPWinningInsert = {
        plan_id: form.plan_id || null,
        plan_name: form.plan_name,
        league: form.league_name || null,
        home_team: form.home_team,
        away_team: form.away_team,
        prediction_type: form.prediction_type || null,
        result: form.result,
        date: form.date,
      }

      const { error } = await supabase
        .from('vip_winnings')
        // @ts-expect-error - Supabase type inference issue
        .insert(insertData)

      if (error) throw error
      toast.success('VIP winning added successfully!')
      router.push('/admin/vip-wins')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save VIP winning')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Add VIP Previous Win</h1>
            <p className="text-sm lg:text-base text-gray-600 mt-1">
              Add a new VIP winning record for a specific plan
            </p>
          </div>
        </div>

        <Card className="border-2 border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <CardTitle className="text-lg font-semibold">VIP Win Details</CardTitle>
            <CardDescription className="text-sm mt-1">
              Fill in the details for the VIP winning record
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="plan_id">
                    Plan <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.plan_id}
                    onValueChange={handlePlanChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {plans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">
                    Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="league">
                  League <span className="text-red-500">*</span>
                </Label>
                <LeagueSelector
                  value={form.league_id}
                  onValueChange={handleLeagueChange}
                  placeholder="Select a league"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="home_team">
                    Home Team <span className="text-red-500">*</span>
                  </Label>
                  <TeamSelector
                    value={form.home_team}
                    onValueChange={(teamName) => setForm({ ...form, home_team: teamName })}
                    placeholder="Select home team"
                    leagueId={form.league_id}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="away_team">
                    Away Team <span className="text-red-500">*</span>
                  </Label>
                  <TeamSelector
                    value={form.away_team}
                    onValueChange={(teamName) => setForm({ ...form, away_team: teamName })}
                    placeholder="Select away team"
                    leagueId={form.league_id}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prediction_type">Prediction Type</Label>
                  <Input
                    id="prediction_type"
                    value={form.prediction_type}
                    onChange={(e) => setForm({ ...form, prediction_type: e.target.value })}
                    placeholder="e.g., Over 1.5, BTTS, Banker"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="result">
                    Result <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.result}
                    onValueChange={(value: 'win' | 'loss') => setForm({ ...form, result: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="win">Win</SelectItem>
                      <SelectItem value="loss">Loss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? 'Saving...' : 'Add VIP Win'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

