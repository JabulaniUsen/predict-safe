import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PagesManager } from '@/components/admin/pages-manager'

export const dynamic = 'force-dynamic'

export default async function AdminPagesPage() {
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

  const { data: pagesData } = await supabase
    .from('custom_pages')
    .select('*')
    .order('footer_order', { ascending: true })
  const pages = pagesData as any[] | null

  return (
    <AdminLayout>
      <PagesManager pages={pages || []} />
    </AdminLayout>
  )
}
