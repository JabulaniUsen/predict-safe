import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    const supabase = await createClient()

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Find transaction by session ID
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*, user_subscriptions(*)')
        .eq('gateway_transaction_id', session.id)
        .single()

      if (transaction && transaction.status === 'pending') {
        // Update transaction
        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            metadata: session,
          })
          .eq('id', transaction.id)

        // Update subscription (similar logic as other gateways)
        const subscription = transaction.user_subscriptions
        if (subscription) {
          const plan = await supabase
            .from('plans')
            .select('*')
            .eq('id', subscription.plan_id)
            .single()

          if (plan.data?.requires_activation && transaction.payment_type === 'subscription') {
            await supabase
              .from('user_subscriptions')
              .update({
                subscription_fee_paid: true,
                plan_status: 'pending_activation',
              })
              .eq('id', subscription.id)
          } else if (transaction.payment_type === 'activation') {
            const startDate = new Date()
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + 7)

            await supabase
              .from('user_subscriptions')
              .update({
                activation_fee_paid: true,
                plan_status: 'active',
                start_date: startDate.toISOString(),
                expiry_date: expiryDate.toISOString(),
              })
              .eq('id', subscription.id)
          } else {
            const startDate = new Date()
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + 7)

            await supabase
              .from('user_subscriptions')
              .update({
                subscription_fee_paid: true,
                plan_status: 'active',
                start_date: startDate.toISOString(),
                expiry_date: expiryDate.toISOString(),
              })
              .eq('id', subscription.id)
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

