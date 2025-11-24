import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifySubscriptionEvent } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin (for manual trigger) or allow system calls
    const { data: { user } } = await supabase.auth.getUser()
    const authHeader = request.headers.get('authorization')
    const systemToken = process.env.SYSTEM_API_TOKEN

    // Allow if admin or system token matches
    if (user) {
      const userProfileResult: any = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      const userProfile = userProfileResult.data as { is_admin: boolean } | null

      if (!userProfile?.is_admin && (!systemToken || authHeader !== `Bearer ${systemToken}`)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (!systemToken || authHeader !== `Bearer ${systemToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Find expired subscriptions
    const { data: expiredSubscriptions } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        plan_id,
        expiry_date,
        plan_status,
        plans!inner(name),
        users!inner(email, full_name)
      `)
      .eq('plan_status', 'active')
      .lt('expiry_date', now)

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      return NextResponse.json({ 
        message: 'No expired subscriptions found',
        checked: 0,
        expired: 0
      })
    }

    let expired = 0
    for (const sub of expiredSubscriptions) {
      const subData = sub as any
      const plan = subData.plans
      const user = subData.users

      // Update subscription status to expired
      await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .update({ plan_status: 'expired' })
        .eq('id', subData.id)

      // Notify user
      await notifySubscriptionEvent(
        subData.user_id,
        plan.name,
        'expired',
        user?.email,
        user?.full_name || undefined
      )

      expired++
    }

    return NextResponse.json({ 
      message: 'Expired subscriptions checked',
      checked: expiredSubscriptions.length,
      expired
    })
  } catch (error: any) {
    console.error('Error checking expired subscriptions:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

