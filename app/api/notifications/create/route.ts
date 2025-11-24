import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifySubscriptionEvent, notifyAdminNewSubscription } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, userId, planName, userEmail, userName, event } = body

    let result

    switch (type) {
      case 'subscription_event':
        if (!planName || !event) {
          return NextResponse.json({ error: 'Plan name and event required' }, { status: 400 })
        }
        result = await notifySubscriptionEvent(
          userId || user.id,
          planName,
          event,
          userEmail,
          userName
        )
        break
      case 'admin_new_subscription':
        if (!planName || !userEmail) {
          return NextResponse.json({ error: 'Plan name and user email required' }, { status: 400 })
        }
        result = await notifyAdminNewSubscription(
          userId || user.id,
          planName,
          userEmail,
          userName
        )
        break
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      notification: 'notification' in result ? result.notification : null 
    })
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

