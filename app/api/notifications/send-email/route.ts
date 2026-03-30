import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailTemplates } from '@/lib/email'

// Simple in-memory rate limiter: max 10 emails per user per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(userId)

  if (!record || now > record.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return true
  }

  record.count++
  return false
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { type, userId, planName, userEmail, userName, planType, currency, amount, duration } = body

    // Get user email if not provided
    let recipientEmail = userEmail
    if (!recipientEmail && userId) {
      const userDataResult: any = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single()
      const userData = userDataResult.data as { email: string; full_name?: string } | null
      
      if (userData) {
        recipientEmail = userData.email
      }
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 400 })
    }

    let emailData
    switch (type) {
      case 'user_welcome':
        emailData = emailTemplates.userWelcome(userName)
        break
      case 'subscription_created':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.subscriptionCreated(planName, userName, planType, currency, amount, duration)
        break
      case 'prediction_dropped':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.predictionDropped(planName)
        break
      case 'subscription_confirmed':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.subscriptionConfirmed(planName)
        break
      case 'subscription_expired':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.subscriptionExpired(planName)
        break
      case 'subscription_removed':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.subscriptionRemoved(planName)
        break
      case 'payment_rejected':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        const { reason } = body
        emailData = emailTemplates.paymentRejected(planName, reason)
        break
      case 'payment_approved':
        if (!planName) {
          return NextResponse.json({ error: 'Plan name required' }, { status: 400 })
        }
        emailData = emailTemplates.paymentApproved(planName)
        break
      case 'admin_new_payment':
        if (!planName || !userEmail || !userName || !amount || !currency) {
          return NextResponse.json({ error: 'Plan name, user email, user name, amount, and currency required' }, { status: 400 })
        }
        emailData = emailTemplates.adminNewPayment(userEmail, userName, planName, amount, currency, planType, duration)
        break
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    const result = await sendEmail({
      to: recipientEmail,
      subject: emailData.subject,
      html: emailData.html,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: any) {
    console.error('Error sending notification email:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

