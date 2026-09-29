import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { Database } from '@/types/database'
import { UserSubscriptionWithPlan } from '@/types'
import { deactivateExpiredSubscriptions } from '@/lib/subscriptions/deactivate-expired'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
}

// Force dynamic rendering - this page requires user authentication
export const dynamic = 'force-dynamic'

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

  // Deactivate past-due plans on visit so expiry takes effect even if the
  // scheduled check hasn't run yet. Awaited: fire-and-forget updates from a
  // Server Component may be killed before they hit the database.
  if (subscriptions) {
    try {
      const { ids } = await deactivateExpiredSubscriptions(supabase as any)
      if (ids.length > 0) {
        // Reflect the deactivation in memory so the page renders correctly
        const deactivatedIds = new Set(ids)
        subscriptions.forEach((sub) => {
          if (deactivatedIds.has(sub.id)) sub.plan_status = 'inactive'
        })
      }
    } catch (err) {
      console.error('Error deactivating expired subscriptions:', err)
    }
  }

  // Count active subscriptions
  const activeSubscriptions = subscriptions?.filter(
    (sub) => sub.plan_status === 'active'
  ).length || 0

  // Get all subscriptions for display
  const allSubscriptions = subscriptions || []

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

