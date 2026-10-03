import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { AdLinksManager } from '@/components/admin/ad-links-manager'
import { Database } from '@/types/database'
import type { AffiliateLink } from '@/lib/affiliate-links'

// Force dynamic rendering - this page requires admin authentication
export const dynamic = 'force-dynamic'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminAdLinksPage() {
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

  // Get all affiliate / partner links
  const { data: adLinks } = await supabase
    .from('ad_links')
    .select('*')
    .order('created_at', { ascending: true })

  return (
    <AdminLayout>
      <AdLinksManager
        adLinks={(adLinks as unknown as AffiliateLink[]) || []}
      />
    </AdminLayout>
  )
}
