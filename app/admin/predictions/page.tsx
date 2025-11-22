import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PredictionsManager } from '@/components/admin/predictions-manager'

export default async function AdminPredictionsPage() {
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

  // Get all predictions
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get correct score predictions
  const { data: correctScorePredictions } = await supabase
    .from('correct_score_predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <p className="text-muted-foreground">Add and manage predictions</p>

        <PredictionsManager
          predictions={predictions || []}
          correctScorePredictions={correctScorePredictions || []}
        />
      </div>
    </AdminLayout>
  )
}

