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

  // Get user subscriptions (including pending so user can see what they've subscribed to)
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

