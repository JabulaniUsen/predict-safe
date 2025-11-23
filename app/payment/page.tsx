'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plan, PlanPrice, Country } from '@/types'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'
type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'country'>
type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']
type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type TransactionUpdate = Database['public']['Tables']['transactions']['Update']

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
  const [userCountry, setUserCountry] = useState<CountryOption>('Nigeria')
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
      const result = await supabase
        .from('users')
        .select('country')
        .eq('id', user.id)
        .maybeSingle()
      
      const userProfile = result.data as UserProfile | null

      if (userProfile?.country && ['Nigeria', 'Ghana', 'Kenya', 'Other'].includes(userProfile.country)) {
        setUserCountry(userProfile.country as CountryOption)
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
      const transactionData: TransactionInsert = {
          user_id: user!.id,
          plan_id: plan.id,
          amount: paymentType === 'activation' ? price.activation_fee! : price.price,
          currency: price.currency,
        payment_gateway: 'stripe', // Default payment gateway
          payment_type: paymentType as 'subscription' | 'activation',
          status: 'pending',
      }
      const txResult: any = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase type inference issue
        .insert(transactionData)
        .select()
        .single()
      const { data: transaction, error: txError } = txResult

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
      if (transaction) {
        const updateData: TransactionUpdate = {
          status: 'completed',
          gateway_transaction_id: 'simulated_' + Date.now(),
          updated_at: new Date().toISOString(),
        }
        const updateResult: any = await supabase
        .from('transactions')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
        .eq('id', transaction.id)
        const { error } = updateResult
        if (error) throw error
      }

      // Update or create subscription
      if (paymentType === 'subscription') {
        // Check if subscription exists
        const subResult = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .eq('plan_id', plan.id)
          .maybeSingle()
        
        const existingSub = subResult.data as any

        const startDate = new Date()
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + parseInt(duration || '7'))

        if (existingSub) {
          // Update existing subscription
          const updateData: UserSubscriptionUpdate = {
              subscription_fee_paid: true,
              plan_status: plan.requires_activation ? 'pending_activation' : 'active',
              start_date: plan.requires_activation ? null : startDate.toISOString(),
              expiry_date: plan.requires_activation ? null : expiryDate.toISOString(),
            updated_at: new Date().toISOString(),
          }
          const result: any = await supabase
            .from('user_subscriptions')
            // @ts-expect-error - Supabase type inference issue
            .update(updateData)
            .eq('id', existingSub.id)
          const { error } = result
          if (error) throw error
        } else {
          // Create new subscription
          const insertData: UserSubscriptionInsert = {
              user_id: user!.id,
              plan_id: plan.id,
              subscription_fee_paid: true,
              activation_fee_paid: false,
              plan_status: plan.requires_activation ? 'pending_activation' : 'active',
              start_date: plan.requires_activation ? null : startDate.toISOString(),
              expiry_date: plan.requires_activation ? null : expiryDate.toISOString(),
          }
          const insertResult: any = await supabase
            .from('user_subscriptions')
            // @ts-expect-error - Supabase type inference issue
            .insert(insertData)
          const { error } = insertResult
          if (error) throw error
        }
      } else if (paymentType === 'activation') {
        // Update subscription to active
        const subResult = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user!.id)
          .eq('plan_id', plan.id)
          .maybeSingle()
        
        const subscription = subResult.data as any

        if (subscription) {
          const startDate = new Date()
          const expiryDate = new Date()
          expiryDate.setDate(expiryDate.getDate() + parseInt(duration || '7'))

          const updateData: UserSubscriptionUpdate = {
              activation_fee_paid: true,
              plan_status: 'active',
              start_date: startDate.toISOString(),
              expiry_date: expiryDate.toISOString(),
            updated_at: new Date().toISOString(),
          }
          const result: any = await supabase
            .from('user_subscriptions')
            // @ts-expect-error - Supabase type inference issue
            .update(updateData)
            .eq('id', subscription.id)
          const { error } = result
          if (error) throw error
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

  // Determine currency symbol based on country
  const getCurrencySymbol = () => {
    if (userCountry === 'Nigeria' || userCountry === 'Other') {
      return '₦'
    } else if (userCountry === 'Ghana') {
      return '₵'
    } else if (userCountry === 'Kenya') {
      return 'KSh'
    }
    return price?.currency || '₦' // Default to price currency or Naira
  }
  const currency = getCurrencySymbol()
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
                Stripe
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

