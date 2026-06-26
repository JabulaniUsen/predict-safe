import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { CompetitionsManager } from '@/components/admin/competitions-manager'

export const dynamic = 'force-dynamic'

export default async function AdminCompetitionsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const profile = profileData as { is_admin: boolean } | null

  if (!profile?.is_admin) redirect('/dashboard')

  const { data: competitionsData } = await (supabase as any)
    .from('competitions')
    .select('*')
    .order('display_order', { ascending: true })

  return (
    <AdminLayout>
      <CompetitionsManager competitions={competitionsData || []} />
    </AdminLayout>
  )
}
