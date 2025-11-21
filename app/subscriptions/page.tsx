'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'
import { PlanWithPrice, Country } from '@/types'
import { Combobox } from '@/components/ui/combobox'

export default function SubscriptionsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithPrice[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null)
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'weekly' | 'monthly'>('monthly')

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Get user country
        const { data: userData } = await supabase
          .from('users')
          .select('country_id, countries(*)')
          .eq('id', user.id)
          .single()

        if (userData?.countries) {
          setSelectedCountry(userData.countries as Country)
        }
      }

      // Fetch all countries for selection
      const { data: countriesData } = await supabase
        .from('countries')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name')

      if (countriesData) {
        const countryOptions = countriesData.map((c: any) => ({
          value: c.id,
          label: c.name,
        }))
        setCountries(countryOptions)
      }

      // Fetch plans with prices
      const { data: plansData } = await supabase
        .from('plans')
        .select(`
          *,
          plan_prices (
            *,
            countries (*)
          )
        `)
        .eq('is_active', true)
        .order('created_at')

      if (plansData) {
        setPlans(plansData as PlanWithPrice[])
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Update prices when country changes
  useEffect(() => {
    const fetchPrices = async () => {
      if (!selectedCountry) return

      const supabase = createClient()
      const updatedPlans = await Promise.all(
        plans.map(async (plan) => {
          const { data: pricesData } = await supabase
            .from('plan_prices')
            .select('*, countries(*)')
            .eq('plan_id', plan.id)
            .or(`country_id.eq.${selectedCountry.id},currency.eq.USD`)
            .order('country_id', { ascending: false })

          return {
            ...plan,
            prices: pricesData || [],
          }
        })
      )

      setPlans(updatedPlans)
    }

    if (plans.length > 0 && selectedCountry) {
      fetchPrices()
    }
  }, [selectedCountry])

  const handlePlanClick = (planSlug: string) => {
    if (!user) {
      router.push('/login')
    } else {
      router.push(`/subscribe?plan=${planSlug}`)
    }
  }

  const getPriceForCountry = (plan: PlanWithPrice, durationDays: number) => {
    if (!selectedCountry && plan.prices) {
      // Default to USD if no country
      return plan.prices.find(
        (p: any) => p.duration_days === durationDays && p.currency === 'USD'
      )
    }

    // Find country-specific price, fallback to USD
    const countryPrice = plan.prices?.find(
      (p: any) => p.duration_days === durationDays && p.country_id === selectedCountry?.id
    )
    
    if (countryPrice) return countryPrice

    // Fallback to USD
    return plan.prices?.find(
      (p: any) => p.duration_days === durationDays && p.currency === 'USD'
    )
  }

  // Determine currency symbol - Naira for Nigeria, USD for others
  const getCurrencySymbol = () => {
    if (selectedCountry?.code === 'NG') {
      return '₦'
    }
    return '$'
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
            <Combobox
              options={countries}
              value={selectedCountry?.id || ''}
              onValueChange={(countryId) => {
                const country = countries.find((c) => c.value === countryId)
                if (country) {
                  // Find the full country object
                  const supabase = createClient()
                  supabase
                    .from('countries')
                    .select('*')
                    .eq('id', countryId)
                    .single()
                    .then(({ data }) => {
                      if (data) {
                        setSelectedCountry(data as Country)
                      }
                    })
                }
              }}
              placeholder="Select country"
              searchPlaceholder="Search countries..."
              emptyMessage="No country found."
            />
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
    </PageLayout>
  )
}

