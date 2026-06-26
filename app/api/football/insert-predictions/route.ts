import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyPredictionDropped } from '@/lib/notifications'
import { PLAN_TYPE_TO_SLUG } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { predictions } = body

    if (!predictions || !Array.isArray(predictions) || predictions.length === 0) {
      return NextResponse.json({ error: 'Predictions array is required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile || !(userProfile as any).is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Prepare all predictions for the predictions table
    // Correct score predictions are identified by plan_type === 'correct_score'
    const validColumns = ['plan_type', 'home_team', 'away_team', 'league', 'league_id', 'prediction_type', 'odds', 'confidence', 'kickoff_time', 'status', 'result', 'admin_notes']
    const cleanedPredictions = predictions.map((pred: any) => {
      const cleaned: any = {}
      
      // Check if this is a correct score prediction by plan_type
      const isCorrectScore = pred.plan_type === 'correct_score' || pred.plan_type === 'correct-score'
      
      // Handle correct score predictions
      if (isCorrectScore) {
        // Extract score from score_prediction or prediction_type
        if (pred.score_prediction) {
          cleaned.prediction_type = pred.score_prediction
        } else if (pred.prediction_type) {
          // If prediction_type is in "Correct Score: 2-1" format, extract just the score
          if (pred.prediction_type.startsWith('Correct Score:')) {
            const scoreMatch = pred.prediction_type.match(/Correct Score:\s*(.+)/)
            cleaned.prediction_type = scoreMatch ? scoreMatch[1].trim() : pred.prediction_type
          } else {
            cleaned.prediction_type = pred.prediction_type
          }
        } else {
          cleaned.prediction_type = '0-0' // Fallback
        }
        
        // Use correct_score as plan_type
        cleaned.plan_type = 'correct_score'
      } else {
        // For regular predictions, use prediction_type as is
        if (pred.prediction_type) {
          cleaned.prediction_type = pred.prediction_type
        }
        cleaned.plan_type = pred.plan_type || 'free'
      }
      
      // Copy all other valid columns
      validColumns.forEach(col => {
        if (col !== 'prediction_type' && col !== 'plan_type') {
          if (pred[col] !== undefined && pred[col] !== null) {
            cleaned[col] = pred[col]
          }
        }
      })
      
      return cleaned
    })

    // Insert all predictions into the predictions table
    const { data, error } = await supabase
      .from('predictions')
      .insert(cleanedPredictions as any)
      .select()

    if (error) {
      console.error('Error inserting predictions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify users subscribed to plans for which predictions were added
    if (data && data.length > 0) {
      try {
        // Group predictions by plan_type
        const planTypes = new Set<string>()
        data.forEach((pred: any) => {
          if (pred.plan_type) {
            planTypes.add(pred.plan_type)
          }
        })

        // Notify for each unique plan type
        for (const planType of planTypes) {
          const planSlug = PLAN_TYPE_TO_SLUG[planType]
          if (planSlug) {
            const planResult: any = await supabase
              .from('plans')
              .select('id, name')
              .eq('slug', planSlug)
              .single()
            const planData = planResult.data as { id: string; name: string } | null

            if (planData) {
              await notifyPredictionDropped(planData.id, planData.name)
            }
          }
        }
      } catch (notifyError) {
        console.error('Error notifying users:', notifyError)
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({ 
      message: 'Predictions inserted successfully', 
      synced: data?.length || 0
    })
  } catch (error: any) {
    console.error('Insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

