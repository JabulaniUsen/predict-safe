import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { UsersManager } from '@/components/admin/users-manager'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminUsersPage() {
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
    .single() as { data: UserProfile | null }

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get all users with subscriptions (no limit to get all users)
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      user_subscriptions (
        *,
        plan:plans (*)
      )
    `)
    .order('created_at', { ascending: false })

  // Get all active plans for adding subscriptions
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  return (
    <AdminLayout>
      <div className="space-y-6">
          <p className="text-muted-foreground">View and manage user accounts</p>

        <UsersManager users={users || []} plans={plans || []} />
      </div>
    </AdminLayout>
  )
}

