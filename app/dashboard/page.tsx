import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { Database } from '@/types/database'
import { UserSubscriptionWithPlan } from '@/types'
import { notifySubscriptionEvent } from '@/lib/notifications'

type UserProfile = Database['public']['Tables']['users']['Row'] & {
  country: string | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile with country
  const { data: userProfileRaw } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
  const userProfile = userProfileRaw as UserProfile | null

  // Get user subscriptions
  const { data: subscriptionsRaw } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
  const subscriptions = subscriptionsRaw as UserSubscriptionWithPlan[] | null

  // Check for expired subscriptions and notify
  if (subscriptions) {
    const now = new Date()
    for (const sub of subscriptions) {
      if (sub.plan_status === 'active' && sub.expiry_date) {
        const expiryDate = new Date(sub.expiry_date)
        if (expiryDate < now) {
          // Update to expired
          await supabase
            .from('user_subscriptions')
            // @ts-expect-error - Supabase type inference issue
            .update({ plan_status: 'expired' })
            .eq('id', sub.id)

          // Notify user
          const plan = sub.plan as any
          await notifySubscriptionEvent(
            user.id,
            plan?.name || 'Unknown Plan',
            'expired',
            userProfile?.email,
            userProfile?.full_name || undefined
          )
        }
      }
    }
  }

  // Re-fetch subscriptions after potential updates
  const { data: subscriptionsRawUpdated } = await supabase
    .from('user_subscriptions')
    .select(`
      *,
      plan:plans(*)
    `)
    .eq('user_id', user.id)
  const subscriptionsUpdated = subscriptionsRawUpdated as UserSubscriptionWithPlan[] | null

  // Count active subscriptions
  const activeSubscriptions = subscriptionsUpdated?.filter(
    (sub) => sub.plan_status === 'active'
  ).length || 0

  // Get all subscriptions for display
  const allSubscriptions = subscriptionsUpdated || []

  // Calculate days since member
  const memberSince = userProfile?.created_at
    ? new Date(userProfile.created_at)
    : new Date()
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

