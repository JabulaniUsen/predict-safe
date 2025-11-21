import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { VIPWinningsSection } from '@/components/home/vip-winnings-section'

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

  return (
    <DashboardLayout user={user} userProfile={userProfile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Previous VIP Winnings</h1>
          <p className="text-muted-foreground">
            View winning records from all paid packages
          </p>
        </div>

        <VIPWinningsSection />
      </div>
    </DashboardLayout>
  )
}

