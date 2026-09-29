import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deactivateExpiredSubscriptions } from '@/lib/subscriptions/deactivate-expired'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { VIPWinningsSection } from '@/components/home/vip-winnings-section'

// Force dynamic rendering - this page requires user authentication
export const dynamic = 'force-dynamic'

export default async function WinningsPage() {
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

  // Deactivate past-due plans on visit (awaited) so the 'active' filter
  // below never includes expired plans — no cron job required.
  try {
    await deactivateExpiredSubscriptions(supabase as any)
  } catch (err) {
    console.error('Error deactivating expired subscriptions:', err)
  }

  // Get user's active subscriptions to filter VIP wins by their plans
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('plan_id')
    .eq('user_id', user.id)
    .eq('plan_status', 'active')

  const planIds = (subscriptions as Array<{ plan_id: string }> | null)?.map((s) => s.plan_id).filter(Boolean) || []

  return (
    <DashboardLayout user={user} userProfile={userProfile}>
      <div className="space-y-6">
        {/* <div>
          <h1 className="text-3xl font-bold">Previous VIP Winnings</h1>
          <p className="text-muted-foreground">
            View winning records from your subscribed packages
          </p>
        </div> */}

        <VIPWinningsSection planIds={planIds} showAll={planIds.length === 0} />
      </div>
    </DashboardLayout>
  )
}

