import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { PredictionsList } from '@/components/dashboard/predictions-list'

export default async function PredictionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*, countries(*)')
    .eq('id', user.id)
    .single()

  // Get user subscriptions
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
    .eq('plan_status', 'active')

  return (
    <DashboardLayout user={user} userProfile={userProfile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Predictions</h1>
          <p className="text-muted-foreground">
            View predictions for your active subscriptions
          </p>
        </div>

        <PredictionsList subscriptions={subscriptions || []} />
      </div>
    </DashboardLayout>
  )
}

