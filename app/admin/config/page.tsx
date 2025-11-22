import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { ConfigManager } from '@/components/admin/config-manager'

export default async function AdminConfigPage() {
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

  // Get site config
  const { data: config } = await supabase
    .from('site_config')
    .select('*')
    .order('key')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <p className="text-muted-foreground">Manage site settings and content</p>

        <ConfigManager config={config || []} />
      </div>
    </AdminLayout>
  )
}

