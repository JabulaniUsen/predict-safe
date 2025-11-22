import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PaymentMethodsManager } from '@/components/admin/payment-methods-manager'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminPaymentMethodsPage() {
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

  // Get all payment methods
  const { data: paymentMethods } = await supabase
    .from('payment_methods')
    .select('*')
    .order('display_order')

  return (
    <AdminLayout>
      <div className="space-y-6">
        <p className="text-muted-foreground">Manage payment methods available to users during checkout</p>

        <PaymentMethodsManager paymentMethods={paymentMethods || []} />
      </div>
    </AdminLayout>
  )
}

