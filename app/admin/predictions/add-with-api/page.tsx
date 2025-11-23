'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminLayout } from '@/components/admin/admin-layout'
import { toast } from 'sonner'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

function AddPredictionWithAPIContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan') || 'profit-multiplier'
  
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
  const [minConfidence, setMinConfidence] = useState([70]) // Default minimum confidence: 70%

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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync predictions')
      }

      const message = data.filtered > 0
        ? `Successfully synced ${data.synced || 0} predictions! ${data.filtered} predictions were filtered out (confidence < ${data.minConfidence}%)`
        : `Successfully synced ${data.synced || 0} predictions!`
      
      toast.success(message)
      router.push('/admin/predictions')
    } catch (error: any) {
      console.error('Error syncing predictions:', error)
      toast.error(error.message || 'Failed to sync predictions')
      setLoading(false)
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
                  {loading ? 'Syncing...' : 'Sync Predictions'}
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

