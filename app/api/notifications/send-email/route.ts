import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailTemplates } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, userId, planName, userEmail, userName } = body

    // Get user email if not provided
    let recipientEmail = userEmail
    if (!recipientEmail && userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single()
      
      if (userData) {
        recipientEmail = userData.email
      }
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Recipient email not found' }, { status: 400 })
    }

    let emailData
    switch (type) {
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
      case 'admin_new_subscription':
        if (!planName || !userEmail) {
          return NextResponse.json({ error: 'Plan name and user email required' }, { status: 400 })
        }
        // Get admin email from environment or use a default
        const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
        if (!adminEmail) {
          return NextResponse.json({ error: 'Admin email not configured' }, { status: 500 })
        }
        emailData = emailTemplates.adminNewSubscription(userEmail, userName || userEmail, planName)
        recipientEmail = adminEmail
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

