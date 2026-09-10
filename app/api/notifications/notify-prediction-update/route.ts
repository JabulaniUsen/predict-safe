import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyPredictionDropped } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const { planType } = body

    if (!planType) {
      return NextResponse.json({ error: 'Plan type is required' }, { status: 400 })
    }

    // Map plan_type to plan slug to get plan ID
    const planTypeToSlug: Record<string, string> = {
      'profit_multiplier': 'daily-50-odds-combo',
      'daily_2_odds': 'daily-2-odds',
      'standard': 'standard',
      'free': 'free',
      'correct_score': 'correct-score'
    }

    const planSlug = planTypeToSlug[planType]
    if (!planSlug) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const planResult: any = await supabase
      .from('plans')
      .select('id, name')
      .eq('slug', planSlug)
      .single()
    
    const planData = planResult.data as { id: string; name: string } | null

    if (!planData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Notify users subscribed to this plan
    const result = await notifyPredictionDropped(planData.id, planData.name)

    return NextResponse.json({ 
      success: true, 
      notified: result.notified 
    })
  } catch (error: any) {
    console.error('Error notifying users:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to notify users' 
    }, { status: 500 })
  }
}

