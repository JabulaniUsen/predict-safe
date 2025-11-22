import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { UsersManager } from '@/components/admin/users-manager'

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
    .single()

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // Get all users with subscriptions
  const { data: users } = await supabase
    .from('users')
    .select(`
      *,
      countries (*),
      user_subscriptions (
        *,
        plan:plans (*)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <p className="text-muted-foreground">View and manage user accounts</p>

        <UsersManager users={users || []} />
      </div>
    </AdminLayout>
  )
}

