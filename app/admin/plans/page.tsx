import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PlansManager } from '@/components/admin/plans-manager'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const result = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  const userProfile = result.data as UserProfile | null

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get all plans with prices (no countries join needed anymore)
  const { data: plans } = await supabase
    .from('plans')
    .select(`
      *,
      plan_prices (*)
    `)
    .order('created_at')

  // Get subscribers per plan
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('plan_id, plan_status')

  return (
    <AdminLayout>
      <div className="space-y-6">
          <p className="text-muted-foreground">Create and manage subscription plans</p>

        <PlansManager
          plans={plans || []}
          subscriptions={subscriptions || []}
        />
      </div>
    </AdminLayout>
  )
}

