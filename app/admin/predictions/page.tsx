import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/admin-layout'
import { PredictionsManager } from '@/components/admin/predictions-manager'
import { Plan, Prediction, CorrectScorePrediction } from '@/types'
import { Database } from '@/types/database'
import type { Metadata } from 'next'
import { adminMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...adminMetadata,
  title: 'Manage Predictions',
}

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'>

export default async function AdminPredictionsPage() {
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

  // Get all active plans
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('created_at')

  // Get all predictions
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  // Get correct score predictions
  const { data: correctScorePredictions } = await supabase
    .from('correct_score_predictions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Manage Predictions</h1>
          <p className="text-sm lg:text-base text-muted-foreground">Add and manage predictions for all plans</p>
        </div>

        <PredictionsManager
          plans={plans as Plan[] || []}
          predictions={predictions as Prediction[] || []}
          correctScorePredictions={correctScorePredictions as CorrectScorePrediction[] || []}
        />
      </div>
    </AdminLayout>
  )
}

