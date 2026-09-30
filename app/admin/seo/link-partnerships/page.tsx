import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { LinkPartnershipsManager } from '@/components/admin/link-partnerships-manager'
import { Database } from '@/types/database'
import type { LinkPartnership } from '@/lib/link-partnerships'

// Force dynamic rendering - this page requires admin authentication
export const dynamic = 'force-dynamic'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminLinkPartnershipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const result = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const userProfile = result.data as UserProfile | null

  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('link_partnerships')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Link Partnerships</h1>
          <p className="text-muted-foreground">
            Admin → SEO → Link Partnerships. Manage reciprocal link exchanges: our outgoing
            links render publicly per placement; their links to us are tracked here.
          </p>
        </div>

        <LinkPartnershipsManager partnerships={(data ?? []) as LinkPartnership[]} />
      </div>
    </AdminLayout>
  )
}
