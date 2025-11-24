'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils/date'
import { LeagueSelector } from '@/components/admin/league-selector'
import { TeamSelector } from '@/components/admin/team-selector'
import Link from 'next/link'

type VIPWinningInsert = Database['public']['Tables']['vip_winnings']['Insert']
type VIPWinningUpdate = Database['public']['Tables']['vip_winnings']['Update']

interface VIPWinsManagerProps {
  winnings: any[]
  plans: any[]
}

export function VIPWinsManager({ winnings: initialWinnings, plans }: VIPWinsManagerProps) {
  const [winnings, setWinnings] = useState(initialWinnings)
  const [loading, setLoading] = useState(false)
  const [editingWinning, setEditingWinning] = useState<any>(null)
  const [showDialog, setShowDialog] = useState(false)
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

  useEffect(() => {
    setWinnings(initialWinnings)
  }, [initialWinnings])

  const handleEdit = (winning: any) => {
    setEditingWinning(winning)
    setForm({
      plan_id: winning.plan_id || '',
      plan_name: winning.plan_name || '',
      league_id: '', // Will need to fetch league_id from league_name if needed
      league_name: winning.league || '',
      home_team: winning.home_team || '',
      away_team: winning.away_team || '',
      prediction_type: winning.prediction_type || '',
      result: winning.result || 'win',
      date: winning.date ? new Date(winning.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
    setShowDialog(true)
  }

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

      if (editingWinning) {
        // Update existing winning
        const updateData: VIPWinningUpdate = {
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
          .update(updateData)
          .eq('id', editingWinning.id)

        if (error) throw error
        toast.success('VIP winning updated successfully!')
      } else {
        // Create new winning
        const insertData: VIPWinningInsert = {
          plan_id: form.plan_id || null,
          plan_name: form.plan_name,
          league: form.league_name || null,
          home_team: form.home_team,
          away_team: form.away_team,
          prediction_type: form.prediction_type,
          result: form.result,
          date: form.date,
        }

        const { error } = await supabase
          .from('vip_winnings')
          // @ts-expect-error - Supabase type inference issue
          .insert(insertData)

        if (error) throw error
        toast.success('VIP winning added successfully!')
      }

      setShowDialog(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save VIP winning')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this VIP winning?')) {
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('vip_winnings')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('VIP winning deleted successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete VIP winning')
    } finally {
      setLoading(false)
    }
  }

  const getPlanName = (winning: any) => {
    if (winning.plan_id) {
      const plan = plans.find((p) => p.id === winning.plan_id)
      return plan?.name || winning.plan_name
    }
    return winning.plan_name
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">VIP Previous Wins</CardTitle>
              <CardDescription className="text-sm mt-1">
                Manage VIP winning records for each plan type
              </CardDescription>
            </div>
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
              <Link href="/admin/vip-wins/add">
                <Plus className="h-4 w-4 mr-2" />
                Add VIP Win
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 lg:p-6">
          {winnings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No VIP winnings records yet.</p>
              <Button asChild className="mt-4 bg-red-600 hover:bg-red-700 text-white">
                <Link href="/admin/vip-wins/add">
                  Add First VIP Win
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Prediction</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {winnings.map((winning) => (
                    <TableRow key={winning.id}>
                      <TableCell className="font-medium">
                        {formatDate(winning.date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPlanName(winning)}</Badge>
                      </TableCell>
                      <TableCell>
                        {winning.league || '-'}
                      </TableCell>
                      <TableCell>
                        {winning.home_team} vs {winning.away_team}
                      </TableCell>
                      <TableCell>{winning.prediction_type}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            winning.result === 'win'
                              ? 'bg-[#22c55e] text-white'
                              : 'bg-red-500 text-white'
                          }
                        >
                          {winning.result === 'win' ? '✓ Win' : '✗ Loss'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(winning)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(winning.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit VIP Winning</DialogTitle>
            <DialogDescription>
              Update the VIP winning record
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan_id">Plan *</Label>
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
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="league">League *</Label>
              <LeagueSelector
                value={form.league_id}
                onValueChange={handleLeagueChange}
                placeholder="Select a league"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="home_team">Home Team *</Label>
                <TeamSelector
                  value={form.home_team}
                  onValueChange={(teamName) => setForm({ ...form, home_team: teamName })}
                  placeholder="Select home team"
                  leagueId={form.league_id}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="away_team">Away Team *</Label>
                <TeamSelector
                  value={form.away_team}
                  onValueChange={(teamName) => setForm({ ...form, away_team: teamName })}
                  placeholder="Select away team"
                  leagueId={form.league_id}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="result">Result *</Label>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? 'Saving...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

