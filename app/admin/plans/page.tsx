import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PlansManager } from '@/components/admin/plans-manager'

export default async function AdminPlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get all plans with prices
  const { data: plans } = await supabase
    .from('plans')
    .select(`
      *,
      plan_prices (
        *,
        countries (*)
      )
    `)
    .order('created_at')

  // Get all countries
  const { data: countries } = await supabase
    .from('countries')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Get subscribers per plan
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('plan_id, plan_status')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Plans</h1>
          <p className="text-muted-foreground">Create and manage subscription plans</p>
        </div>

        <PlansManager
          plans={plans || []}
          countries={countries || []}
          subscriptions={subscriptions || []}
        />
      </div>
    </AdminLayout>
  )
}

