'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plan, PlanPrice, Country } from '@/types'

export default function SubscribePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')
  const step = searchParams.get('step')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [prices, setPrices] = useState<PlanPrice[]>([])
  const [selectedDuration, setSelectedDuration] = useState<number>(7)
  const [selectedPrice, setSelectedPrice] = useState<PlanPrice | null>(null)
  const [user, setUser] = useState<any>(null)
  const [country, setCountry] = useState<Country | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

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
      if (planSlug) {
        const { data: planData } = await supabase
          .from('plans')
          .select('*')
          .eq('slug', planSlug)
          .eq('is_active', true)
          .single()

        if (planData) {
          setPlan(planData)

          // Get prices for user's country or default to USD
          const countryId = (userProfile?.countries as Country)?.id
          const { data: pricesData } = await supabase
            .from('plan_prices')
            .select('*')
            .eq('plan_id', planData.id)
            .eq('duration_days', selectedDuration)
            .or(countryId ? `country_id.eq.${countryId},currency.eq.USD` : 'currency.eq.USD')
            .order('country_id', { ascending: false })

          if (pricesData && pricesData.length > 0) {
            setPrices(pricesData)
            // Prefer country-specific price, fallback to USD
            const countryPrice = pricesData.find((p) => p.country_id === countryId)
            setSelectedPrice(countryPrice || pricesData[0])
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [planSlug, selectedDuration, router])

  const handlePayment = () => {
    if (!plan || !selectedPrice) return

    // Check if this is activation fee payment
    if (step === 'activation' && plan.requires_activation) {
      router.push(`/payment?plan=${plan.id}&price=${selectedPrice.id}&type=activation`)
    } else {
      router.push(`/payment?plan=${plan.id}&price=${selectedPrice.id}&duration=${selectedDuration}`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Plan not found</h1>
          <Button asChild>
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    )
  }

  // Determine currency - Naira for Nigeria, USD for others
  const getCurrencySymbol = () => {
    if (country?.code === 'NG') {
      return '₦'
    }
    return '$'
  }
  const currency = getCurrencySymbol()

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>
          {plan.requires_activation && (
            <Badge variant="secondary" className="mt-2 w-fit">
              Requires Activation Fee
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'activation' && plan.requires_activation ? (
            <>
              <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <p className="font-semibold mb-2">Activation Fee Required</p>
                <p className="text-sm">
                  You have paid the subscription fee. Now pay the activation fee to unlock predictions.
                </p>
              </div>
              {selectedPrice?.activation_fee && (
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {currency}
                    {selectedPrice.activation_fee}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Activation Fee</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Duration</label>
                <Select
                  value={selectedDuration.toString()}
                  onValueChange={(value) => {
                    setSelectedDuration(parseInt(value))
                    const price = prices.find((p) => p.duration_days === parseInt(value))
                    if (price) setSelectedPrice(price)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPrice && (
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {currency}
                    {selectedPrice.price}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedDuration === 7 ? '1 Week' : '1 Month'} Subscription
                  </p>
                  {plan.requires_activation && selectedPrice.activation_fee && (
                    <p className="text-sm text-muted-foreground mt-1">
                      + {currency}
                      {selectedPrice.activation_fee} activation fee (paid separately)
                    </p>
                  )}
                </div>
              )}

              {plan.benefits && plan.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Benefits:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit, idx) => (
                      <li key={idx}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <Button className="w-full" size="lg" onClick={handlePayment} disabled={!selectedPrice}>
            {step === 'activation' ? 'Pay Activation Fee' : 'Proceed to Payment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

