import { createClient } from '@/lib/supabase/server'

export type NotificationType = 
  | 'prediction_dropped'
  | 'subscription_confirmed'
  | 'subscription_expired'
  | 'subscription_removed'
  | 'admin_new_subscription'
  | 'payment_rejected'
  | 'payment_approved'
  | 'admin_new_payment'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  sendEmail?: boolean
  planName?: string
  userEmail?: string
  userName?: string
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  sendEmail: shouldSendEmail = true,
  planName,
  userEmail,
  userName,
}: CreateNotificationParams) {
  const supabase = await createClient()

  // Create notification in database
  const { data: notification, error } = await supabase
    .from('notifications')
    // @ts-expect-error - Supabase type inference issue
    .insert({
      user_id: userId,
      type,
      title,
      message,
      read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    return { success: false, error }
  }

  // Send email if requested
  if (shouldSendEmail) {
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          userId,
          planName,
          userEmail,
          userName,
        }),
      })

      if (!emailResponse.ok) {
        console.error('Failed to send notification email')
      }
    } catch (emailError) {
      console.error('Error sending notification email:', emailError)
    }
  }

  return { success: true, notification }
}

// Helper function to notify users when predictions are dropped for a plan
export async function notifyPredictionDropped(planId: string, planName: string) {
  const supabase = await createClient()

  // Get all users subscribed to this plan
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('user_id, users!inner(email, full_name)')
    .eq('plan_id', planId)
    .eq('plan_status', 'active')

  if (!subscriptions || subscriptions.length === 0) {
    return { success: true, notified: 0 }
  }

  let notified = 0
  for (const sub of subscriptions) {
    const subData = sub as any
    const user = subData.users
    const result = await createNotification({
      userId: subData.user_id,
      type: 'prediction_dropped',
      title: 'New Predictions Available!',
      message: `Predictions for ${planName} have dropped!`,
      planName,
      userEmail: user?.email,
      userName: user?.full_name,
    })

    if (result.success) {
      notified++
    }
  }

  return { success: true, notified }
}

// Helper function to notify subscription events
export async function notifySubscriptionEvent(
  userId: string,
  planName: string,
  event: 'confirmed' | 'expired' | 'removed',
  userEmail?: string,
  userName?: string
) {
  const typeMap = {
    confirmed: 'subscription_confirmed' as NotificationType,
    expired: 'subscription_expired' as NotificationType,
    removed: 'subscription_removed' as NotificationType,
  }

  const titleMap = {
    confirmed: 'Subscription Confirmed',
    expired: 'Subscription Expired',
    removed: 'Subscription Removed',
  }

  const messageMap = {
    confirmed: `Your subscription for ${planName} has been confirmed!`,
    expired: `Your subscription for ${planName} has expired.`,
    removed: `Your subscription for ${planName} has been removed. Please renew your subscription to get back on track.`,
  }

  return await createNotification({
    userId,
    type: typeMap[event],
    title: titleMap[event],
    message: messageMap[event],
    planName,
    userEmail,
    userName,
  })
}

// Helper function to notify admin of new subscription
export async function notifyAdminNewSubscription(
  userId: string,
  planName: string,
  userEmail: string,
  userName?: string
) {
  // Get admin user ID (first admin user)
  const supabase = await createClient()
  const adminResult: any = await supabase
    .from('users')
    .select('id')
    .eq('is_admin', true)
    .limit(1)
    .single()
  const admin = adminResult.data as { id: string } | null

  if (!admin) {
    console.warn('No admin user found for notification')
    return { success: false, error: 'No admin found' }
  }

  return await createNotification({
    userId: admin.id,
    type: 'admin_new_subscription',
    title: 'New Subscription',
    message: `${userName || userEmail} has subscribed to ${planName}`,
    planName,
    userEmail,
    userName,
  })
}

