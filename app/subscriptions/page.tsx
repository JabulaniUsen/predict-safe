'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import { PlanWithPrice } from '@/types'
import { Combobox } from '@/components/ui/combobox'

interface Country {
  name: string
  code: string
  cca3: string
}

export default function SubscriptionsPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithPrice[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'weekly' | 'monthly'>('monthly')

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/countries')
        if (!response.ok) throw new Error('Failed to fetch countries')
        
        const data: Country[] = await response.json()
        
        // Map to combobox format and add "Other" option
        const countryOptions = data.map((country) => ({
          value: country.name,
          label: country.name
        }))
        
        // Add "Other" option at the end
        countryOptions.push({ value: 'Other', label: 'Other' })
        
        setCountries(countryOptions)
        setLoadingCountries(false)
      } catch (error) {
        console.error('Error fetching countries:', error)
        // Fallback to basic list if API fails
        setCountries([
          { value: 'Nigeria', label: 'Nigeria' },
          { value: 'Ghana', label: 'Ghana' },
          { value: 'Kenya', label: 'Kenya' },
          { value: 'Other', label: 'Other' },
        ])
        setLoadingCountries(false)
      }
    }

    fetchCountries()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Check user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

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
    if (!plan.prices || plan.prices.length === 0 || !selectedCountry) return null

    // First, try to find exact country match
    const exactMatch = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.country === selectedCountry
    )
    if (exactMatch) return exactMatch

    // If Nigeria, look for Nigeria-specific price
    if (selectedCountry === 'Nigeria') {
      const nigeriaPrice = plan.prices.find(
        (p: any) => p.duration_days === durationDays && p.country === 'Nigeria'
      )
      if (nigeriaPrice) return nigeriaPrice
    }

    // For all other countries, look for USD prices (country = 'Other' or currency = 'USD')
    const usdPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && (p.currency === 'USD' || p.country === 'Other')
    )
    if (usdPrice) return usdPrice

    // Fallback: try to find any price for this duration with matching currency
    const matchingCurrency = selectedCountry === 'Nigeria' ? 'NGN' : 'USD'
    const currencyPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.currency === matchingCurrency
    )
    if (currencyPrice) return currencyPrice

    // Final fallback: any price for this duration
    return plan.prices.find(
      (p: any) => p.duration_days === durationDays
    )
  }

  // Determine currency symbol based on selected country
  const getCurrencySymbol = () => {
    if (selectedCountry === 'Nigeria') {
      return '₦'
    }
    return '$' // USD for all other countries
  }

  const currency = getCurrencySymbol()
  const popularPlanSlug = 'daily-2-odds'

  if (loading || loadingCountries) {
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
        {/* Country Selection - Required First Step */}
        <div className="mb-8">
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-center">Select Your Country</CardTitle>
              <CardDescription className="text-center">
                Please select your country to view pricing and available plans
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label className="text-sm font-semibold text-gray-700">Country:</label>
                <div className="w-full sm:w-96">
                  <Combobox
                    options={countries}
                    value={selectedCountry}
                    onValueChange={(value) => setSelectedCountry(value)}
                    placeholder="Search or select country..."
                    searchPlaceholder="Search countries..."
                    emptyMessage="No country found."
                  />
                </div>
                {selectedCountry && (
                  <div className="text-sm text-gray-600">
                    Currency: <span className="font-bold">{currency}</span>
                    {selectedCountry !== 'Nigeria' && (
                      <span className="ml-2 text-xs text-gray-500">(USD pricing)</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Show plans only if country is selected */}
        {!selectedCountry ? (
          <Card className="border-2 border-gray-200">
            <CardContent className="py-12 text-center">
              <p className="text-lg text-gray-600">
                Please select a country above to view available plans and pricing.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
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

            {/* Pricing Cards - Reference Style */}
            <div className="bg-gray-50 py-12 px-4 rounded-lg">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
                {plans.slice(0, 4).map((plan, index) => {
              const selectedPrice = billingPeriod === 'weekly' 
                ? getPriceForCountry(plan, 7)
                : getPriceForCountry(plan, 30)
              const isPopular = plan.slug === popularPlanSlug

              return (
                <div
                  key={plan.id}
                  className="relative"
                >
                  <Card 
                    className={`h-full flex flex-col bg-white border border-gray-200 shadow-sm transition-all duration-300 ${
                      isPopular ? 'border-[#1e40af] border-2' : ''
                    }`}
                  >
                    <CardHeader className="pb-4 pt-6 px-6 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-xl font-bold text-gray-900 uppercase">
                          {plan.name}
                        </CardTitle>
                        {isPopular && (
                          <div className="bg-green-500 w-8 h-8 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">★</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col px-6 pb-6 bg-white">
                      {/* Pricing */}
                      <div className="mb-4">
                        {selectedPrice ? (
                          <div>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-4xl font-bold text-gray-900">{currency}</span>
                              <span className="text-5xl font-bold text-gray-900">
                                {(() => {
                                  const priceValue = typeof selectedPrice.price === 'number' 
                                    ? selectedPrice.price 
                                    : parseFloat(String(selectedPrice.price || '0'))
                                  return priceValue.toLocaleString('en-US', { maximumFractionDigits: 0 })
                                })()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              /{billingPeriod === 'weekly' ? 'week' : 'mo'}
                            </p>
                            {plan.requires_activation && (
                              <p className="text-xs text-gray-500">+ Activation Fee</p>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400">Price not available</div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        {plan.description || 'Premium predictions for serious bettors.'}
                      </p>

                      {/* Features */}
                      <div className="mb-6 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase">Features</h3>
                        {plan.benefits && plan.benefits.length > 0 && (
                          <ul className="space-y-2.5">
                            {plan.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-[#1e40af] flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-900">{benefit}</span>
                              </li>
                            ))}
                            {plan.max_predictions_per_day && (
                              <li className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-[#1e40af] flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-900">
                                  Up to {plan.max_predictions_per_day} predictions per day
                                </span>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Button
                        className="w-full font-semibold py-3 bg-gray-800 hover:bg-gray-900 text-white rounded transition-all duration-300"
                        onClick={() => handlePlanClick(plan.slug, billingPeriod === 'weekly' ? 7 : 30)}
                      >
                        ► {selectedPrice ? 'GET STARTED' : 'START FOR FREE'}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )
                })}
              </div>
            </div>

            {/* Additional Plans if more than 4 */}
            {plans.length > 4 && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-center mb-8 text-[#1e40af]">Additional Plans</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans.slice(4).map((plan) => {
                const selectedPrice = billingPeriod === 'weekly' 
                  ? getPriceForCountry(plan, 7)
                  : getPriceForCountry(plan, 30)

                return (
                  <Card key={plan.id} className="h-full flex flex-col bg-white border border-gray-200 shadow-sm">
                    <CardHeader className="pb-4 pt-6 px-6 bg-white">
                      <CardTitle className="text-xl font-bold text-gray-900 uppercase">
                        {plan.name}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col px-6 pb-6 bg-white">
                      <div className="mb-4">
                        {selectedPrice ? (
                          <div>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-3xl font-bold text-gray-900">{currency}</span>
                              <span className="text-4xl font-bold text-gray-900">
                                {(() => {
                                  const priceValue = typeof selectedPrice.price === 'number' 
                                    ? selectedPrice.price 
                                    : parseFloat(String(selectedPrice.price || '0'))
                                  return priceValue.toLocaleString('en-US', { maximumFractionDigits: 0 })
                                })()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              /{billingPeriod === 'weekly' ? 'week' : 'mo'}
                            </p>
                          </div>
                        ) : (
                          <div className="text-gray-400">Price not available</div>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-6">{plan.description}</p>

                      {plan.benefits && plan.benefits.length > 0 && (
                        <ul className="flex-1 space-y-2 mb-6">
                          {plan.benefits.slice(0, 3).map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-[#1e40af] flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-gray-900">{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        className="w-full font-semibold py-3 bg-gray-800 hover:bg-gray-900 text-white rounded"
                        onClick={() => handlePlanClick(plan.slug, billingPeriod === 'weekly' ? 7 : 30)}
                      >
                        ► GET STARTED
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              All plans include 24/7 support and regular updates.
            </p>
          </div>
        </>
        )}
      </div>
    </PageLayout>
  )
}

