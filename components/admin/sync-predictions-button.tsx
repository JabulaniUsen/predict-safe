'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function SyncPredictionsButton() {
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [planType, setPlanType] = useState('free')

  const handleSync = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/football/sync-predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, planType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync predictions')
      }

      toast.success(`Successfully synced ${data.synced} predictions!`)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to sync predictions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Sync from API Football</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Predictions from API Football</DialogTitle>
          <DialogDescription>
            Fetch fixtures from API Football and convert them to predictions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planType">Plan Type</Label>
            <select
              id="planType"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="free">Free</option>
              <option value="profit_multiplier">Profit Multiplier</option>
              <option value="daily_2_odds">Daily 2 Odds</option>
              <option value="standard">Standard</option>
            </select>
          </div>
          <Button onClick={handleSync} disabled={loading} className="w-full">
            {loading ? 'Syncing...' : 'Sync Predictions'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

