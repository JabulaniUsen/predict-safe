'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Prediction, CorrectScorePrediction } from '@/types'
import { SyncPredictionsButton } from './sync-predictions-button'

interface PredictionsManagerProps {
  predictions: Prediction[]
  correctScorePredictions: CorrectScorePrediction[]
}

export function PredictionsManager({ predictions, correctScorePredictions }: PredictionsManagerProps) {
  const [loading, setLoading] = useState(false)

  const handleAddPrediction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      plan_type: formData.get('plan_type'),
      home_team: formData.get('home_team'),
      away_team: formData.get('away_team'),
      league: formData.get('league'),
      prediction_type: formData.get('prediction_type'),
      odds: parseFloat(formData.get('odds') as string),
      confidence: parseInt(formData.get('confidence') as string),
      kickoff_time: formData.get('kickoff_time'),
      admin_notes: formData.get('admin_notes') || null,
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('predictions').insert(data)

      if (error) throw error

      toast.success('Prediction added successfully!')
      e.currentTarget.reset()
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add prediction')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCorrectScore = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      home_team: formData.get('home_team'),
      away_team: formData.get('away_team'),
      league: formData.get('league'),
      score_prediction: formData.get('score_prediction'),
      odds: formData.get('odds') ? parseFloat(formData.get('odds') as string) : null,
      kickoff_time: formData.get('kickoff_time'),
      admin_notes: formData.get('admin_notes') || null,
    }

    try {
      const supabase = createClient()
      const { error } = await supabase.from('correct_score_predictions').insert(data)

      if (error) throw error

      toast.success('Correct score prediction added successfully!')
      e.currentTarget.reset()
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add prediction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="regular" className="space-y-4">
      <TabsList>
        <TabsTrigger value="regular">Regular Predictions</TabsTrigger>
        <TabsTrigger value="correct-score">Correct Score</TabsTrigger>
      </TabsList>

      <TabsContent value="regular" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Add New Prediction</CardTitle>
                <CardDescription>Manually add a prediction</CardDescription>
              </div>
              <div className="flex gap-2">
                <SyncPredictionsButton />
                <Dialog>
                <DialogTrigger asChild>
                  <Button>Add Prediction</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Prediction</DialogTitle>
                    <DialogDescription>Fill in the details for the new prediction</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPrediction} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plan_type">Plan Type</Label>
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
                        <Label htmlFor="prediction_type">Prediction Type</Label>
                        <Input name="prediction_type" placeholder="e.g., Over 2.5, Home Win" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="home_team">Home Team</Label>
                        <Input name="home_team" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="away_team">Away Team</Label>
                        <Input name="away_team" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="league">League</Label>
                        <Input name="league" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="odds">Odds</Label>
                        <Input name="odds" type="number" step="0.01" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confidence">Confidence (%)</Label>
                        <Input name="confidence" type="number" min="0" max="100" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kickoff_time">Kickoff Time</Label>
                      <Input name="kickoff_time" type="datetime-local" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                      <Textarea name="admin_notes" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Adding...' : 'Add Prediction'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teams</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Odds</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions.map((pred) => (
                    <TableRow key={pred.id}>
                      <TableCell>
                        {pred.home_team} vs {pred.away_team}
                      </TableCell>
                      <TableCell>{pred.league}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pred.prediction_type}</Badge>
                      </TableCell>
                      <TableCell>{pred.odds}</TableCell>
                      <TableCell>{pred.confidence}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pred.status === 'finished'
                              ? 'default'
                              : pred.status === 'live'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {pred.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="correct-score" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Add Correct Score Prediction</CardTitle>
                <CardDescription>Manually add a correct score prediction</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Add Correct Score</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Correct Score Prediction</DialogTitle>
                    <DialogDescription>Fill in the details for the correct score prediction</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddCorrectScore} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="home_team">Home Team</Label>
                        <Input name="home_team" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="away_team">Away Team</Label>
                        <Input name="away_team" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="league">League</Label>
                        <Input name="league" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="score_prediction">Score Prediction</Label>
                        <Input name="score_prediction" placeholder="e.g., 2-1" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="odds">Odds (Optional)</Label>
                        <Input name="odds" type="number" step="0.01" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kickoff_time">Kickoff Time</Label>
                        <Input name="kickoff_time" type="datetime-local" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
                      <Textarea name="admin_notes" />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? 'Adding...' : 'Add Correct Score'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teams</TableHead>
                    <TableHead>League</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Odds</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {correctScorePredictions.map((pred) => (
                    <TableRow key={pred.id}>
                      <TableCell>
                        {pred.home_team} vs {pred.away_team}
                      </TableCell>
                      <TableCell>{pred.league}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pred.score_prediction}</Badge>
                      </TableCell>
                      <TableCell>{pred.odds || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pred.status === 'finished'
                              ? 'default'
                              : pred.status === 'live'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {pred.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

