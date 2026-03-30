import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export type NotificationType = 
  | 'prediction_dropped'
  | 'subscription_confirmed'
  | 'subscription_expired'
  | 'subscription_removed'
  | 'admin_new_subscription'
  | 'payment_rejected'
  | 'payment_approved'
  | 'admin_new_payment'
  | 'user_welcome'
  | 'subscription_created'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  sendEmail?: boolean
  planName?: string
  /** Email address the notification email is sent TO. Falls back to the userId's email if omitted. */
  recipientEmail?: string
  /** Subscriber email used in admin-facing templates as context info. */
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
  recipientEmail,
  userEmail,
  userName,
}: CreateNotificationParams) {
  const supabase = await createClient()

  // Create notification in database
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      read: false,
    } as any)
    .select()
    .single()

  if (error) {
    console.error('Error creating notification:', error)
    return { success: false, error }
  }

  // Send email directly — no HTTP round-trip to own API
  if (shouldSendEmail) {
    // Determine recipient: explicit recipientEmail > userEmail > look up from DB
    let toEmail = recipientEmail || userEmail
    if (!toEmail) {
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      toEmail = (userData as any)?.email
    }

    if (toEmail) {
      let emailData: { subject: string; html: string } | null = null

      switch (type) {
        case 'user_welcome':
          emailData = emailTemplates.userWelcome(userName)
          break
        case 'prediction_dropped':
          if (planName) emailData = emailTemplates.predictionDropped(planName)
          break
        case 'subscription_confirmed':
          if (planName) emailData = emailTemplates.subscriptionConfirmed(planName)
          break
        case 'subscription_expired':
          if (planName) emailData = emailTemplates.subscriptionExpired(planName)
          break
        case 'subscription_removed':
          if (planName) emailData = emailTemplates.subscriptionRemoved(planName)
          break
        case 'payment_approved':
          if (planName) emailData = emailTemplates.paymentApproved(planName)
          break
        case 'admin_new_subscription':
          if (planName && userEmail)
            emailData = emailTemplates.adminNewSubscription(userEmail, userName || userEmail, planName)
          break
        // payment_rejected and admin_new_payment require extra context (reason, amount, currency)
        // and are sent directly from admin actions — not via createNotification
      }

      if (emailData) {
        sendEmail({ to: toEmail, subject: emailData.subject, html: emailData.html }).catch(
          (err) => console.error('Error sending notification email:', err)
        )
      }
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
  // Get admin user (first admin)
  const supabase = await createClient()
  const adminResult: any = await supabase
    .from('users')
    .select('id, email')
    .eq('is_admin', true)
    .limit(1)
    .single()
  const admin = adminResult.data as { id: string; email: string } | null

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
    recipientEmail: admin.email, // email goes TO the admin
    userEmail,                   // subscriber context used inside the template
    userName,
  })
}

