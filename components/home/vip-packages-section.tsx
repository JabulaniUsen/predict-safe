'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlanWithPrice } from '@/types'
import { Check } from 'lucide-react'
import { getCurrencyFromCountry, getCurrencySymbol as getCurrencySymbolUtil } from '@/lib/utils/currency'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'

export function VIPPackagesSection() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanWithPrice[]>([])
  const [user, setUser] = useState<any>(null)
  const [userCountry, setUserCountry] = useState<string>('Nigeria')
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

        if (userData?.country) {
          // Store the actual country name, not limited to CountryOption
          setUserCountry(userData.country as any)
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
          
          // Debug: Log prices to see currency field
          if (prices.length > 0) {
            console.log('Plan:', plan.name, 'Prices:', prices.map((p: any) => ({
              country: p.country,
              currency: p.currency,
              price: p.price
            })))
          }
          
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

    // First priority: Find exact country match (handles Ghana, Canada, etc.)
    if (userCountry) {
      const exactCountryPrice = plan.prices.find(
        (p: any) => p.duration_days === durationDays && p.country === userCountry
      )
      if (exactCountryPrice) {
        return exactCountryPrice
      }
    }

    // Second priority: If Nigeria, look for Nigeria-specific price
    if (userCountry === 'Nigeria') {
      const nigeriaPrice = plan.prices.find(
        (p: any) => p.duration_days === durationDays && p.country === 'Nigeria'
      )
      if (nigeriaPrice) return nigeriaPrice
    }

    // Third priority: Look for USD prices (country = 'Other' or currency = 'USD')
    const usdPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && (p.currency === 'USD' || p.country === 'Other')
    )
    if (usdPrice) return usdPrice

    // Fourth priority: Fallback to Nigeria price if available
    const nigeriaPrice = plan.prices.find(
      (p: any) => p.duration_days === durationDays && p.country === 'Nigeria'
    )
    if (nigeriaPrice) return nigeriaPrice

    // Final fallback: any price for this duration
    return plan.prices.find(
      (p: any) => p.duration_days === durationDays
    )
  }

  // Helper function to convert currency code to symbol
  const getCurrencySymbol = (currencyCode?: string | null, priceCountry?: string | null) => {
    // First priority: Use currency code from database if available
    if (currencyCode && typeof currencyCode === 'string' && currencyCode.trim()) {
      const symbol = getCurrencySymbolUtil(currencyCode.trim())
      if (symbol && symbol !== currencyCode) {
        return symbol
      }
      // If utility returns the code itself, it means it's not in the map, return it as-is
      return symbol
    }

    // Second priority: Infer currency from country name if currency not set
    // This is critical - when a price exists for a specific country, use that country's currency
    if (priceCountry && typeof priceCountry === 'string' && priceCountry.trim()) {
      const countryCurrencyCode = getCurrencyFromCountry(priceCountry.trim())
      if (countryCurrencyCode) {
        const symbol = getCurrencySymbolUtil(countryCurrencyCode)
        // Always use the country-based currency, even if it's USD
        // This ensures Ghana shows GHS, Canada shows CAD, etc.
        return symbol
      }
    }

    // Third priority: Use user country to infer currency
    if (userCountry && typeof userCountry === 'string' && userCountry.trim() && userCountry !== 'Nigeria') {
      const userCountryCurrencyCode = getCurrencyFromCountry(userCountry.trim())
      if (userCountryCurrencyCode) {
        const symbol = getCurrencySymbolUtil(userCountryCurrencyCode)
        return symbol
      }
    }

    // Final fallback: Default to USD
    console.warn('Currency fallback to USD - currencyCode:', currencyCode, 'priceCountry:', priceCountry, 'userCountry:', userCountry)
    return '$'
  }

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
    <section className="py-8 lg:py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 lg:mb-4 text-[#1e40af]">Choose Your Plan</h2>
          <p className="text-sm sm:text-base lg:text-xl text-gray-600 mb-4 lg:mb-8 max-w-2xl mx-auto px-2">
            Select the perfect package to maximize your betting success
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 lg:gap-3 bg-white p-1 rounded-lg border-2 border-gray-200 shadow-sm">
            <button
              onClick={() => setBillingPeriod('weekly')}
              className={`px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-semibold transition-all ${
                billingPeriod === 'weekly'
                  ? 'bg-[#1e40af] text-white shadow-md'
                  : 'text-gray-600 hover:text-[#1e40af]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-semibold transition-all ${
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
        <div className="bg-gray-50 py-12 px-4 rounded-lg">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const selectedPrice = billingPeriod === 'weekly' 
                ? getPriceForCountry(plan, 7)
                : getPriceForCountry(plan, 30)
              const isPopular = plan.slug === popularPlanSlug
              
              // Get currency from selected price - ensure we access it correctly
              const priceCurrency = selectedPrice ? (selectedPrice as any).currency : null
              const priceCountry = selectedPrice ? (selectedPrice as any).country : null
              
              // Always use the country from the selected price to determine currency
              // This ensures we show the correct currency even if currency field is null
              const currency = getCurrencySymbol(priceCurrency, priceCountry || userCountry)

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
                              <p className="text-xs text-gray-500">+ Activation</p>
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
                        onClick={() => handlePlanClick(plan.slug)}
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

