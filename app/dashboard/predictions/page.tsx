import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { deactivateExpiredSubscriptions } from '@/lib/subscriptions/deactivate-expired'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PredictionsList } from '@/components/dashboard/predictions-list'

// Force dynamic rendering - this page requires user authentication
export const dynamic = 'force-dynamic'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // Deactivate past-due plans on visit (awaited) so expiry takes effect
  // without any cron job or background worker.
  try {
    await deactivateExpiredSubscriptions(supabase as any)
  } catch (err) {
    console.error('Error deactivating expired subscriptions:', err)
  }

  // Get all active plans
  const { data: allPlans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  // Get user subscriptions
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .in('plan_status', ['active', 'pending', 'pending_activation'])
    .order('created_at', { ascending: false })

  return (
    <DashboardLayout user={user} userProfile={userProfile}>
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">My Predictions</h1>
          <p className="text-sm lg:text-base text-muted-foreground mt-1">
            View predictions for all plans. Subscribe to unlock premium predictions.
          </p>
        </div>

        <Suspense fallback={<div>Loading predictions...</div>}>
          <PredictionsList allPlans={allPlans || []} subscriptions={subscriptions || []} />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}

