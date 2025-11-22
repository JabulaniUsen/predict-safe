import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { TransactionsManager } from '@/components/admin/transactions-manager'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminTransactionsPage() {
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

  // Get all transactions with user and plan info
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      users(email, full_name),
      plans(name)
    `)
    .order('created_at', { ascending: false })

  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AdminLayout>
      <div className="space-y-6">
        <p className="text-muted-foreground">Review payments and activate user subscriptions</p>

        <TransactionsManager 
          transactions={transactions || []} 
          subscriptions={subscriptions || []}
        />
      </div>
    </AdminLayout>
  )
}

