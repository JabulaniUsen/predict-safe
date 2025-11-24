import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { NotificationsList } from '@/components/dashboard/notifications-list'
import { redirect } from 'next/navigation'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminNotificationsPage() {
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

  // Fetch notifications for admin
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return (
    <AdminLayout>
      <NotificationsList 
        notifications={notifications || []} 
        unreadCount={unreadCount || 0}
      />
    </AdminLayout>
  )
}

