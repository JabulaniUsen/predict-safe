'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plan, PlanPrice, Country, PaymentMethod } from '@/types'
import { Database } from '@/types/database'
import Image from 'next/image'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'country'>

// Helper function to map any country name to supported CountryOption
const mapCountryToOption = (countryName: string): CountryOption => {
  if (countryName === 'Nigeria') return 'Nigeria'
  if (countryName === 'Ghana') return 'Ghana'
  if (countryName === 'Kenya') return 'Kenya'
  return 'Other'
}

function SubscribeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')
  const step = searchParams.get('step')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [prices, setPrices] = useState<PlanPrice[]>([])
  const [selectedDuration, setSelectedDuration] = useState<number>(7)
  const [selectedPrice, setSelectedPrice] = useState<PlanPrice | null>(null)
  const [user, setUser] = useState<any>(null)
  const [userCountry, setUserCountry] = useState<string>('')
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true)
        const response = await fetch('/api/countries')
        if (!response.ok) throw new Error('Failed to fetch countries')
        const data = await response.json()
        
        const countryOptions = data.map((country: any) => ({
          value: country.name,
          label: country.name,
        }))
        
        setCountries(countryOptions)
      } catch (error) {
        console.error('Error fetching countries:', error)
      } finally {
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
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Get user country
      const result = await supabase
        .from('users')
        .select('country')
        .eq('id', user.id)
        .maybeSingle()
      
      const userProfile = result.data as UserProfile | null

      if (userProfile?.country) {
        // Use the actual country name from the user profile
        const countryName = userProfile.country
        setUserCountry(countryName)
        setSelectedCountry(countryName)
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

          // Get prices for the user's own country, if we know it.
          const userCountry = userProfile?.country?.trim() || ''
          const { data: pricesData } = await supabase
            .from('plan_prices')
            .select('*')
            .eq('plan_id', (planData as Plan)?.id)
            .eq('duration_days', selectedDuration)

          if (pricesData && pricesData.length > 0) {
            setPrices(pricesData)

            // Country-specific price first, then the international USD tier.
            // Falling back to the *Nigerian* price, as this used to, quoted a
            // user in another country a price in naira.
            const countryPrice = userCountry
              ? pricesData.find(
                  (p: any) =>
                    p.country && p.country.trim().toLowerCase() === userCountry.toLowerCase()
                )
              : undefined

            const internationalPrice = pricesData.find(
              (p: any) => p.country === 'Other' || p.currency === 'USD'
            )

            setSelectedPrice(countryPrice || internationalPrice || pricesData[0])
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [planSlug, selectedDuration, router])

  // Fetch payment methods when country changes
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const supabase = createClient()
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      // Filter payment methods based on selected country
      const filteredMethods = methodsData?.filter((method: any) => {
        const methodData = method as any
        const methodCountries = methodData.countries 
          ? (Array.isArray(methodData.countries) ? methodData.countries : [])
          : (methodData.country ? [methodData.country] : [])
        
        // Crypto and Skrill are always available
        if (method.type === 'crypto' || method.type === 'skrill') {
          return true
        }
        
        // If no countries specified, available for all
        if (methodCountries.length === 0) {
          return true
        }
        
        // Check if selected country is in the list
        return methodCountries.includes(selectedCountry)
      })

      if (filteredMethods) {
        setPaymentMethods(filteredMethods)
      }
    }

    fetchPaymentMethods()
  }, [selectedCountry])

  // Update prices when country changes
  useEffect(() => {
    const updatePrices = async () => {
      if (!plan) return

      const supabase = createClient()
      const { data: pricesData } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('plan_id', plan.id)
        .eq('duration_days', selectedDuration)

      if (pricesData && pricesData.length > 0) {
        setPrices(pricesData)
        // Prefer country-specific price, fallback to Nigeria, then any price
        const countryPrice = pricesData.find((p: any) => p.country === selectedCountry)
        if (countryPrice) {
          setSelectedPrice(countryPrice)
        } else {
          // Try to find a price for the user's country
          const userCountryPrice = pricesData.find((p: any) => p.country === userCountry)
          if (userCountryPrice) {
            setSelectedPrice(userCountryPrice)
          } else {
            const nigeriaPrice = pricesData.find((p: any) => p.country === 'Nigeria')
            setSelectedPrice(nigeriaPrice || pricesData[0])
          }
        }
      }
    }

    updatePrices()
  }, [selectedCountry, plan, selectedDuration])

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

  // Helper function to convert currency code to symbol
  const getCurrencySymbol = (currencyCode?: string | null) => {
    if (!currencyCode) {
      // Fallback to hardcoded mapping if currency not available
      const countryOption = mapCountryToOption(selectedCountry)
      if (countryOption === 'Nigeria' || countryOption === 'Other') {
        return '₦'
      } else if (countryOption === 'Ghana') {
        return '₵'
      } else if (countryOption === 'Kenya') {
        return 'KSh'
      }
      return '₦' // Default to Naira
    }

    // Map currency codes to symbols
    const currencyMap: Record<string, string> = {
      'NGN': '₦',
      'GHS': '₵',
      'KES': 'KSh',
      'USD': '$',
      'CAD': 'C$',
      'GBP': '£',
      'EUR': '€',
      'ZAR': 'R',
      'UGX': 'USh',
      'TZS': 'TSh',
      'XOF': 'CFA',
      'XAF': 'FCFA',
    }

    // Return symbol if found, otherwise return the currency code itself
    return currencyMap[currencyCode.toUpperCase()] || currencyCode
  }

  // Use currency from selected price, fallback to country-based mapping
  const currency = getCurrencySymbol(selectedPrice?.currency)

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
              {/* Country Selection */}
              <div className="space-y-2">
                <Label>Select Country</Label>
                {loadingCountries ? (
                  <div className="text-center py-4 border rounded-md">Loading countries...</div>
                ) : (
                  <Combobox
                    options={countries}
                    value={selectedCountry}
                    onValueChange={(value) => setSelectedCountry(value)}
                    placeholder="Select a country..."
                    searchPlaceholder="Search countries..."
                    emptyMessage="No country found."
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Payment methods will be filtered based on your country selection
                </p>
              </div>

              {/* Payment Methods Preview */}
              {paymentMethods.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Payment Methods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50"
                      >
                        {method.logo_url ? (
                          <div className="relative w-8 h-8 flex-shrink-0">
                            <Image
                              src={method.logo_url}
                              alt={method.name}
                              fill
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 flex-shrink-0 border rounded flex items-center justify-center bg-white">
                            <span className="text-xs font-semibold">
                              {method.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{method.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

export default function SubscribePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <SubscribeContent />
    </Suspense>
  )
}

