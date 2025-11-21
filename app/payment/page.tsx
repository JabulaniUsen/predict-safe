'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plan, PlanPrice, Country } from '@/types'
import { toast } from 'sonner'

// This is a placeholder - you'll need to integrate actual payment gateways
export default function PaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan')
  const priceId = searchParams.get('price')
  const duration = searchParams.get('duration')
  const paymentType = searchParams.get('type') || 'subscription'

  const [plan, setPlan] = useState<Plan | null>(null)
  const [price, setPrice] = useState<PlanPrice | null>(null)
  const [country, setCountry] = useState<Country | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get user country
      const { data: userProfile } = await supabase
        .from('users')
        .select('country_id, countries(*)')
        .eq('id', user.id)
        .single()

      if (userProfile?.countries) {
        setCountry(userProfile.countries as Country)
      }

      // Get plan
      if (planId) {
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .single()

        setPlan(planData)
      }

      // Get price
      if (priceId) {
        const { data: priceData } = await supabase
          .from('plan_prices')
          .select('*')
          .eq('id', priceId)
          .single()

        setPrice(priceData)
      }

      setLoading(false)
    }

    fetchData()
  }, [planId, priceId, router])

  const handlePayment = async () => {
    if (!plan || !price) return

    setProcessing(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user!.id,
          plan_id: plan.id,
          amount: paymentType === 'activation' ? price.activation_fee! : price.price,
          currency: price.currency,
          payment_gateway: country?.payment_gateway || 'stripe',
          payment_type: paymentType as 'subscription' | 'activation',
          status: 'pending',
        })
        .select()
        .single()

      if (txError) throw txError

      // TODO: Integrate actual payment gateway here
      // For now, we'll simulate a successful payment
      // In production, you would:
      // 1. Initialize payment with Flutterwave/Paystack/Stripe
      // 2. Redirect to payment page
      // 3. Handle webhook callback

      // Simulate payment success (REMOVE IN PRODUCTION)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: 'completed', gateway_transaction_id: 'simulated_' + Date.now() })
        .eq('id', transaction.id)

      // Update or create subscription
      if (paymentType === 'subscription') {
        // Check if subscription exists
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .eq('plan_id', plan.id)
          .single()

        const startDate = new Date()
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + parseInt(duration || '7'))

        if (existingSub) {
          // Update existing subscription
          await supabase
            .from('user_subscriptions')
            .update({
              subscription_fee_paid: true,
              plan_status: plan.requires_activation ? 'pending_activation' : 'active',
              start_date: plan.requires_activation ? null : startDate.toISOString(),
              expiry_date: plan.requires_activation ? null : expiryDate.toISOString(),
            })
            .eq('id', existingSub.id)
        } else {
          // Create new subscription
          await supabase
            .from('user_subscriptions')
            .insert({
              user_id: user!.id,
              plan_id: plan.id,
              subscription_fee_paid: true,
              activation_fee_paid: false,
              plan_status: plan.requires_activation ? 'pending_activation' : 'active',
              start_date: plan.requires_activation ? null : startDate.toISOString(),
              expiry_date: plan.requires_activation ? null : expiryDate.toISOString(),
            })
        }
      } else if (paymentType === 'activation') {
        // Update subscription to active
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .eq('plan_id', plan.id)
          .single()

        if (subscription) {
          const startDate = new Date()
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + parseInt(duration || '7'))

          await supabase
            .from('user_subscriptions')
            .update({
              activation_fee_paid: true,
              plan_status: 'active',
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
            })
            .eq('id', subscription.id)
        }
      }

      toast.success('Payment successful!')
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.message || 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!plan || !price) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid payment details</h1>
          <Button asChild>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    )
  }

  const currency = country?.currency_symbol || price.currency || '$'
  const amount = paymentType === 'activation' ? price.activation_fee! : price.price

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            {paymentType === 'activation' ? 'Pay Activation Fee' : 'Subscribe to'} {plan.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span className="font-medium">{plan.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="text-2xl font-bold">
                {currency}
                {amount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-medium">
                {country?.payment_gateway?.toUpperCase() || 'Stripe'}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
            <p className="text-sm">
              <strong>Note:</strong> This is a demo payment. In production, you would be redirected
              to the payment gateway.
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Complete Payment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

