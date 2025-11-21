import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with country
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

  // Count active subscriptions
  const activeSubscriptions = subscriptions?.filter(
    (sub) => sub.plan_status === 'active'
  ).length || 0

  // Get all subscriptions for display
  const allSubscriptions = subscriptions || []

  // Calculate days since member
  const memberSince = userProfile?.created_at
    ? new Date(userProfile.created_at)
    : new Date(user.created_at || Date.now())
  const daysSince = Math.floor(
    (Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <DashboardLayout user={user} userProfile={userProfile}>
      <DashboardContent
        user={user}
        userProfile={userProfile}
        activeSubscriptions={activeSubscriptions}
        daysSince={daysSince}
        memberSince={memberSince}
        subscriptions={allSubscriptions}
      />
    </DashboardLayout>
  )
}

