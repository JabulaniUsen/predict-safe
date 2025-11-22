'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { PlanWithPrice } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'

export default function SubscriptionsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithPrice[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>('Nigeria')
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
          setSelectedCountry(userData.country as CountryOption)
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

  // No need to refetch prices when country changes - prices are already loaded
  // We'll filter by country in getPriceForCountry function

  const handlePlanClick = (planSlug: string, durationDays: number) => {
    if (!user) {
      router.push('/login')
    } else {
      router.push(`/checkout?plan=${planSlug}&duration=${durationDays}`)
    }
  }

  const getPriceForCountry = (plan: PlanWithPrice, durationDays: number) => {
    if (!plan.prices || plan.prices.length === 0) return null

    // First, try to find country-specific price
    const countryPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.country === selectedCountry
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

  // Determine currency symbol based on selected country
  const getCurrencySymbol = () => {
    if (selectedCountry === 'Nigeria' || selectedCountry === 'Other') {
      return '₦'
    } else if (selectedCountry === 'Ghana') {
      return '₵'
    } else if (selectedCountry === 'Kenya') {
      return 'KSh'
    }
    return '₦' // Default to Naira
  }

  const currency = getCurrencySymbol()
  const popularPlanSlug = 'daily-2-odds'

  if (loading) {
    return (
      <PageLayout title="Subscriptions" subtitle="Choose your plan">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Subscriptions" subtitle="Choose the perfect plan for your betting success">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Country Selection */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Select Country:</label>
          <div className="w-64">
            <Select value={selectedCountry} onValueChange={(value) => setSelectedCountry(value as CountryOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nigeria">Nigeria (₦)</SelectItem>
                <SelectItem value="Ghana">Ghana (₵)</SelectItem>
                <SelectItem value="Kenya">Kenya (KSh)</SelectItem>
                <SelectItem value="Other">Other (₦)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            Currency: <span className="font-bold">{currency}</span>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="text-center mb-12">
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
                      onClick={() => handlePlanClick(plan.slug, billingPeriod === 'weekly' ? 7 : 30)}
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
    </PageLayout>
  )
}

