import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Verify webhook signature
    const signature = request.headers.get('x-paystack-signature')
    const secret = process.env.PAYSTACK_SECRET_KEY || ''

    if (signature) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(JSON.stringify(body))
        .digest('hex')

      if (hash !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const { event, data } = body

    if (event === 'charge.success') {
      // Find transaction by reference
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*, user_subscriptions(*)')
        .eq('gateway_transaction_id', data.reference)
        .single()

      if (transaction && transaction.status === 'pending') {
        // Update transaction
        await supabase
          .from('transactions')
          .update({
            status: 'completed',
            gateway_transaction_id: data.id.toString(),
            metadata: data,
          })
          .eq('id', transaction.id)

        // Update subscription (similar logic as Flutterwave)
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

