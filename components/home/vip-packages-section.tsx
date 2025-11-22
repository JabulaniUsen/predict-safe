'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanWithPrice } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'

export function VIPPackagesSection() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithPrice[]>([])
  const [user, setUser] = useState<any>(null)
  const [userCountry, setUserCountry] = useState<CountryOption>('Nigeria')
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'weekly' | 'monthly'>('monthly')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get user country - use maybeSingle to handle case where user doesn't exist in users table yet
        const { data: userData } = await supabase
          .from('users')
          .select('country')
          .eq('id', user.id)
          .maybeSingle() as { data: { country: string } | null }

        if (userData?.country && ['Nigeria', 'Ghana', 'Kenya', 'Other'].includes(userData.country)) {
          setUserCountry(userData.country as CountryOption)
        }
      }

      // Fetch ALL active plans with ALL their prices from admin
      const { data: plansData } = await supabase
        .from('plans')
        .select(`
          *,
          plan_prices (*)
        `)
        .eq('is_active', true)
        .order('created_at')

      if (plansData) {
        // Map plan_prices to prices property and ensure we handle the data structure correctly
        // This ensures all prices added by admin are available for display
        const plansWithPrices: PlanWithPrice[] = plansData.map((plan: any) => {
          // Handle both plan_prices (from query) and prices (already mapped)
          // Filter out any null prices and ensure we have an array
          const prices = (plan.plan_prices || plan.prices || []).filter((p: any) => p !== null)
          return {
            ...plan,
            prices: prices
          }
        })
        setPlans(plansWithPrices)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const handlePlanClick = (planSlug: string) => {
    if (!user) {
      router.push('/login')
    } else {
      router.push(`/subscribe?plan=${planSlug}`)
    }
  }

  const getPriceForCountry = (plan: PlanWithPrice, durationDays: number) => {
    if (!plan.prices || plan.prices.length === 0) return null

    // First, try to find country-specific price
    const countryPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.country === userCountry
    )
    if (countryPrice) return countryPrice

    // Fallback to Nigeria (default)
    const nigeriaPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.country === 'Nigeria'
    )
    if (nigeriaPrice) return nigeriaPrice

    // Final fallback: any price for this duration
    return plan.prices.find(
      (p: any) => p.duration_days === durationDays
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
    return '₦' // Default to Naira
  }
  const currency = getCurrencySymbol()

  if (loading) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-3xl font-bold text-center">VIP Premium Packages</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-3/4 bg-gray-200 rounded" />
                  <div className="h-4 w-full bg-gray-200 rounded mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-1/2 bg-gray-200 rounded mb-4" />
                  <div className="h-10 w-full bg-gray-200 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    )
  }

  // Determine which plan is "popular" (e.g., Daily 2 Odds or Standard)
  const popularPlanSlug = 'daily-2-odds'

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold mb-4 text-[#1e40af]">Choose Your Plan</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Select the perfect package to maximize your betting success
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white p-1 rounded-lg border-2 border-gray-200 shadow-sm">
            <button
              onClick={() => setBillingPeriod('weekly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'weekly'
                  ? 'bg-[#1e40af] text-white shadow-md'
                  : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-[#1e40af] text-white shadow-md'
                  : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => {
            const selectedPrice = billingPeriod === 'weekly' 
              ? getPriceForCountry(plan, 7)
              : getPriceForCountry(plan, 30)
            const isPopular = plan.slug === popularPlanSlug

            return (
              <div
                key={plan.id}
                className={`relative ${isPopular ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white px-4 py-1 text-sm font-bold shadow-lg">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <Card 
                  className={`h-full flex flex-col border-2 transition-all duration-300 ${
                    isPopular
                      ? 'border-[#22c55e] shadow-2xl scale-105'
                      : 'border-gray-200 hover:border-[#1e40af] hover:shadow-xl'
                  }`}
                >
                  <CardHeader className={`pb-4 ${isPopular ? 'bg-gradient-to-r from-[#22c55e] to-[#16a34a]' : 'bg-white'}`}>
                    <CardTitle className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-[#1e40af]'}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={isPopular ? 'text-green-50' : 'text-gray-600'}>
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col p-6 bg-white">
                    {/* Pricing */}
                    <div className="mb-6">
                      {selectedPrice ? (
                        <div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-3xl font-bold text-gray-900">{currency}</span>
                            <span className="text-5xl font-bold text-[#1e40af]">{selectedPrice.price}</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            per {billingPeriod === 'weekly' ? 'week' : 'month'}
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-400">Price not available</div>
                      )}
                      {plan.requires_activation && (
                        <Badge className="mt-2 bg-[#f97316] text-white text-xs">
                          + Activation Fee
                        </Badge>
                      )}
                    </div>

                    {/* Features */}
                    {plan.benefits && plan.benefits.length > 0 && (
                      <ul className="flex-1 space-y-3 mb-6">
                        {plan.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">{benefit}</span>
                          </li>
                        ))}
                        {plan.max_predictions_per_day && (
                          <li className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-[#22c55e] flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">
                              Up to {plan.max_predictions_per_day} predictions per day
                            </span>
                          </li>
                        )}
                      </ul>
                    )}

                    {/* CTA Button */}
                    <Button
                      className={`w-full font-bold py-6 text-lg transition-all duration-300 ${
                        isPopular
                          ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#f97316] text-white shadow-lg hover:shadow-xl'
                          : 'bg-gradient-to-r from-[#1e40af] to-[#1e3a8a] hover:from-[#1e3a8a] hover:to-[#1e40af] text-white'
                      }`}
                      onClick={() => handlePlanClick(plan.slug)}
                    >
                      Get Started
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            All plans include 24/7 support and regular updates. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}

