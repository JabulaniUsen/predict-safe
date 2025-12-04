'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import { Upload, X, Check, Copy, Globe, MessageCircle } from 'lucide-react'
import { Plan, PlanPrice, PaymentMethod } from '@/types'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'
type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'country'>
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']
type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']

// Helper function to map any country name to supported CountryOption
const mapCountryToOption = (countryName: string): CountryOption => {
  if (countryName === 'Nigeria') return 'Nigeria'
  if (countryName === 'Ghana') return 'Ghana'
  if (countryName === 'Kenya') return 'Kenya'
  return 'Other'
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')
  const durationParam = searchParams.get('duration')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<PlanPrice | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(durationParam ? parseInt(durationParam) : 30)
  const [user, setUser] = useState<any>(null)
  const [userCountry, setUserCountry] = useState<string>('Nigeria')
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria')
  const [showCountryDialog, setShowCountryDialog] = useState(false)
  const [tempCountry, setTempCountry] = useState<string>('Nigeria')
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState<string>('')

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
        // Map stored country option to full country name for display
        // If it's one of our supported options, use it directly
        // Otherwise default to Nigeria
        const countryOption = userProfile.country as CountryOption
        const countryName = countryOption === 'Other' ? 'Nigeria' : countryOption
        setUserCountry(countryName)
        setSelectedCountry(countryName)
        setTempCountry(countryName)
      }

      // Fetch WhatsApp number from site config
      const { data: configData } = await supabase
        .from('site_config')
        .select('key, value')
        .in('key', ['whatsapp_number', 'whatsapp_numbers'])

      if (configData && Array.isArray(configData)) {
        let whatsappNum = ''
        configData.forEach((item: { key: string; value: any }) => {
          if (item.key === 'whatsapp_number') {
            whatsappNum = typeof item.value === 'string' ? item.value : String(item.value || '')
          } else if (item.key === 'whatsapp_numbers' && !whatsappNum) {
            // Legacy support: if whatsapp_number doesn't exist, try whatsapp_numbers (array)
            try {
              const parsed = typeof item.value === 'string' 
                ? JSON.parse(item.value) 
                : item.value
              if (Array.isArray(parsed) && parsed.length > 0) {
                whatsappNum = parsed[0] // Use first number from legacy array
              }
            } catch {
              if (Array.isArray(item.value) && item.value.length > 0) {
                whatsappNum = item.value[0]
              }
            }
          }
        })
        if (whatsappNum) {
          setWhatsappNumber(whatsappNum)
        }
      }

      // Get plan
      if (planSlug) {
        const planResult = await supabase
          .from('plans')
          .select('*')
          .eq('slug', planSlug)
          .eq('is_active', true)
          .single()
        
        const planData = planResult.data as Plan | null

        if (planData) {
          setPlan(planData)
          
          // Get price for selected duration and country
          // Map selected country to CountryOption for price lookup
          const countryOption = mapCountryToOption(selectedCountry)
          const { data: pricesData } = await supabase
            .from('plan_prices')
            .select('*')
            .eq('plan_id', planData.id)
            .eq('duration_days', selectedDuration)

          if (pricesData && pricesData.length > 0) {
            // Try to find country-specific price first, then fallback to Nigeria, then any price
            const countryPrice = pricesData.find((p: any) => p.country === countryOption)
            if (countryPrice) {
              setSelectedPrice(countryPrice)
            } else {
              const nigeriaPrice = pricesData.find((p: any) => p.country === 'Nigeria')
              setSelectedPrice(nigeriaPrice || pricesData[0])
            }
          } else {
            // No price found
            setSelectedPrice(null)
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

      // Filter in memory based on countries array
      // Crypto and Skrill are available for all countries
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
        setPaymentMethods(filteredMethods as PaymentMethod[])
        // Reset selected payment method if it's no longer available
        if (selectedPaymentMethod && !filteredMethods.find((m: any) => m.id === selectedPaymentMethod.id)) {
          setSelectedPaymentMethod(null)
          setShowPaymentConfirmation(false)
          setPaymentProof(null)
          setProofPreview(null)
        }
      }
    }

    fetchPaymentMethods()
  }, [selectedCountry, selectedPaymentMethod])

  // Fetch price when duration or country changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!plan) return

      const supabase = createClient()
      // Map selected country to CountryOption for price lookup
      const countryOption = mapCountryToOption(selectedCountry)
      const { data: pricesData } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('plan_id', plan.id)
        .eq('duration_days', selectedDuration)

      if (pricesData && pricesData.length > 0) {
        // Try to find country-specific price first, then fallback to Nigeria, then any price
        const countryPrice = pricesData.find((p: any) => p.country === countryOption)
        if (countryPrice) {
          setSelectedPrice(countryPrice)
        } else {
          const nigeriaPrice = pricesData.find((p: any) => p.country === 'Nigeria')
          setSelectedPrice(nigeriaPrice || pricesData[0])
        }
      } else {
        // No price found
        setSelectedPrice(null)
      }
    }

    if (plan) {
      fetchPrice()
    }
  }, [selectedDuration, selectedCountry, plan])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }

      setPaymentProof(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeProof = () => {
    setPaymentProof(null)
    setProofPreview(null)
  }

  const uploadProof = async (): Promise<string | null> => {
    if (!paymentProof || !user) return null

    setUploading(true)
    try {
      const supabase = createClient()
      
      // Create a unique filename
      const fileExt = paymentProof.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading proof:', error)
      toast.error('Failed to upload payment proof')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmPayment = () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method')
      return
    }
    setShowPaymentConfirmation(true)
  }

  const handleSubmit = async () => {
    if (!plan || !selectedPrice || !selectedPaymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    if (!paymentProof) {
      toast.error('Please upload payment proof')
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Upload payment proof
      const proofUrl = await uploadProof()
      if (!proofUrl) {
        setSubmitting(false)
        return
      }

      // Create transaction record
      const transactionData: TransactionInsert = {
          user_id: user.id,
          plan_id: plan.id,
          amount: selectedPrice.price,
          currency: selectedPrice.currency,
        payment_gateway: selectedPaymentMethod.name,
          payment_type: 'subscription',
          status: 'pending',
          metadata: {
            payment_proof_url: proofUrl,
            duration_days: selectedDuration,
          payment_method_id: selectedPaymentMethod.id,
          payment_method_name: selectedPaymentMethod.name,
          payment_method_type: selectedPaymentMethod.type,
        } as any,
      }
      const txResult: any = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase type inference issue
        .insert(transactionData)
        .select()
        .single()
      const { data: transaction, error: txError } = txResult

      if (txError) throw txError

      // Create or update subscription with pending status
      // Status will be 'pending' until admin confirms payment, then 'active'
      const subResult = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', plan.id)
        .maybeSingle()
      
      const existingSub = subResult.data as any
      let subscriptionId: string | null = null

      if (existingSub) {
        // Update existing subscription
        const updateData: UserSubscriptionUpdate = {
            subscription_fee_paid: false, // Will be true after admin confirms
            plan_status: 'pending', // Pending admin confirmation
            updated_at: new Date().toISOString(),
        }
        const updateResult: any = await supabase
          .from('user_subscriptions')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', existingSub.id)
          .select()
        const { error: subError, data: updatedSub } = updateResult
        
        if (subError) throw subError
        subscriptionId = updatedSub?.[0]?.id || existingSub.id
      } else {
        // Create new subscription
        const insertData: UserSubscriptionInsert = {
            user_id: user.id,
            plan_id: plan.id,
            subscription_fee_paid: false,
            activation_fee_paid: false,
            plan_status: 'pending', // Pending admin confirmation
        }
        const insertResult: any = await supabase
          .from('user_subscriptions')
          // @ts-expect-error - Supabase type inference issue
          .insert(insertData)
          .select()
        const { error: subError, data: insertedSub } = insertResult
        
        if (subError) throw subError
        subscriptionId = insertedSub?.[0]?.id || null
      }

      // Update transaction with subscription_id for easier linking
      if (subscriptionId && transaction) {
        await supabase
          .from('transactions')
          // @ts-expect-error - Supabase type inference issue
          .update({ subscription_id: subscriptionId })
          .eq('id', transaction.id)
      }

      // Send email to user that subscription has been created / submitted (non-blocking)
      try {
        await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'subscription_created',
            userId: user.id,
            planName: plan.name,
            userEmail: user.email,
          }),
        })
      } catch (emailError) {
        console.error('Error sending subscription created email:', emailError)
        // Don't throw - payment and subscription are already created
      }

      // Notify admin about new payment
      try {
        // Get admin user
        const adminResult: any = await supabase
          .from('users')
          .select('id, email')
          .eq('is_admin', true)
          .limit(1)
          .single()
        const adminUser = adminResult.data as any

        if (adminUser) {
          // Get user info for notification
          const userProfileResult: any = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single()
          const userProfile = userProfileResult.data as any

          const planName = plan.name
          const userName = userProfile?.full_name || user.email?.split('@')[0] || 'User'
          const userEmail = userProfile?.email || user.email

          // Create notification for admin
          await supabase
            .from('notifications')
            // @ts-expect-error - Supabase type inference issue
            .insert({
              user_id: adminUser.id,
              type: 'admin_new_payment',
              title: 'New Payment Submitted',
              message: `${userName} (${userEmail}) has submitted a payment proof for ${planName}. Amount: ${selectedPrice.currency} ${selectedPrice.price}`,
              read: false,
            })

          // Send email to admin
          try {
            await fetch('/api/notifications/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'admin_new_payment',
                userId: adminUser.id,
                planName,
                userEmail,
                userName,
                amount: selectedPrice.price,
                currency: selectedPrice.currency,
              }),
            })
          } catch (emailError) {
            console.error('Error sending admin notification email:', emailError)
            // Don't throw - notification is already created
          }
        }
      } catch (notifError) {
        console.error('Error creating admin notification:', notifError)
        // Don't throw - payment is already submitted
      }

      toast.success('Payment proof submitted! Your subscription will be activated after admin confirmation.')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error submitting payment:', error)
      toast.error(error.message || 'Failed to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  // Determine currency from the price's currency field, or fallback based on country
  const getCurrencySymbol = () => {
    // Use currency from the price if available
    if (selectedPrice?.currency) {
      const currencyMap: Record<string, string> = {
        'NGN': '₦',
        'GHS': '₵',
        'KES': 'KSh',
        'USD': '$',
        'EUR': '€',
      }
      return currencyMap[selectedPrice.currency] || selectedPrice.currency
    }
    
    // Fallback to country-based currency
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
  const currency = getCurrencySymbol()

  const handleCountryChange = () => {
    setSelectedCountry(tempCountry)
    setShowCountryDialog(false)
    // Reset payment method selection when country changes
    setSelectedPaymentMethod(null)
    setShowPaymentConfirmation(false)
    setPaymentProof(null)
    setProofPreview(null)
  }

  const handlePaymentMethodAction = async (method: PaymentMethod) => {
    setSelectedPaymentMethod(method)
    
    // For Paystack or other online payment gateways, redirect to payment
    const isPaystack = method.name.toLowerCase().includes('paystack')
    const isOnlinePayment = method.type === 'skrill' || method.type === 'paypal' || isPaystack
    
    if (isPaystack || isOnlinePayment) {
      // TODO: Integrate actual payment gateway redirect here
      // For now, show payment confirmation
      setShowPaymentConfirmation(true)
    } else {
      // For manual payment methods (bank transfer, mobile money, crypto), show payment proof upload
      setShowPaymentConfirmation(true)
    }
    
    setPaymentProof(null)
    setProofPreview(null)
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard!`)
    } catch (error) {
      console.error('Failed to copy:', error)
      toast.error('Failed to copy to clipboard')
    }
  }

  if (loading) {
    return (
      <PageLayout title="Checkout" subtitle="Complete your subscription">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </PageLayout>
    )
  }

  if (!plan) {
    return (
      <PageLayout title="Checkout" subtitle="Complete your subscription">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Plan not found</h1>
            <Button asChild>
              <a href="/subscriptions">Back to Subscriptions</a>
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (!selectedPrice) {
  return (
    <PageLayout title="Checkout" subtitle="Complete your subscription">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-4">Price Not Available</h1>
            <p className="text-muted-foreground mb-4">
              No price has been set for {plan.name} in {selectedCountry}. Please contact support or select a different country.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowCountryDialog(true)}>
              <a href="/subscriptions">Change Country</a>
                </Button>
                <Button asChild>
                  <a href="/subscriptions">Back to Subscriptions</a>
                </Button>
              </div>
            </div>
          </div>
        </PageLayout>
      )
    }

  const planName = plan.name.toUpperCase()
  const planDescription = plan.description || `This gives you access to all VIP stores for ${selectedDuration === 7 ? 'one week' : 'one month'}`
                      const priceValue = typeof selectedPrice.price === 'number' 
                        ? selectedPrice.price 
                        : parseFloat(String(selectedPrice.price || '0'))
  const formattedPrice = priceValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <PageLayout title="Checkout" subtitle="Complete your subscription">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Package Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-purple-900 mb-2">{planName}</h1>
          <p className="text-lg text-gray-600 mb-4">{planDescription}</p>
          <div className="text-4xl md:text-5xl font-bold text-purple-900 mb-4">
            {currency}{formattedPrice}
              </div>

          {/* Country Display with Change Button */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-2">
            <span className="text-red-600 font-semibold">
              Payment Options available in {selectedCountry}!
            </span>
            <Dialog open={showCountryDialog} onOpenChange={setShowCountryDialog}>
              <DialogTrigger asChild>
                <Button variant="link" className="text-blue-600 hover:text-blue-700 p-0 h-auto">
                  <Globe className="h-4 w-4 mr-1" />
                  Not your country? Change country
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Country</DialogTitle>
                  <DialogDescription>
                    Select your country to see available payment methods
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {loadingCountries ? (
                    <div className="text-center py-4">Loading countries...</div>
                  ) : (
                    <Combobox
                      options={countries}
                      value={tempCountry}
                      onValueChange={(value) => setTempCountry(value)}
                      placeholder="Select a country..."
                      searchPlaceholder="Search countries..."
                      emptyMessage="No country found."
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCountryDialog(false)}>
                      Cancel
                  </Button>
                    <Button onClick={handleCountryChange} disabled={loadingCountries}>
                      Change Country
                  </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
                </div>
              </div>

        {/* Payment Methods Grid */}
        {paymentMethods.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <p className="text-lg text-gray-600 mb-2">No payment methods available for {selectedCountry}</p>
            <p className="text-sm text-gray-500">Please change your country to see available payment methods</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentMethods.map((method) => {
              const isPaystack = method.name.toLowerCase().includes('paystack')
              const isOnlinePayment = method.type === 'skrill' || method.type === 'paypal' || isPaystack
              
              return (
                <div
                  key={method.id}
                  className={`rounded-lg p-6 ${
                    isPaystack
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border-2 border-green-500'
                  }`}
                >
                  {/* Logo and Title */}
                  <div className="flex flex-col items-center mb-6">
                    {method.logo_url ? (
                      <div className={`relative w-24 h-24 mb-4 ${isPaystack ? '' : 'bg-white rounded-lg p-2'}`}>
                        <Image
                          src={method.logo_url}
                          alt={method.name}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <div className={`w-24 h-24 mb-4 flex items-center justify-center rounded-lg ${
                        isPaystack ? 'bg-white/20' : 'bg-gray-100'
                      }`}>
                        <span className={`text-3xl font-bold ${
                          isPaystack ? 'text-white' : 'text-gray-400'
                        }`}>
                          {method.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h3 className={`text-xl font-bold text-center ${
                      isPaystack ? 'text-white' : 'text-gray-900'
                    }`}>
                        {method.name}
                    </h3>
              </div>

              {/* Payment Details */}
                  <div className={`space-y-3 mb-6 ${isPaystack ? 'text-white/90' : 'text-gray-700'}`}>
                    {isPaystack && (
                      <p className="text-sm text-center">
                        Pay with ATM Card, USSD and Bank. Your account will be automatically activated after a successful transaction.
                      </p>
                    )}
                    
                    {!isPaystack && (
                      <>
                        <p className="font-semibold mb-3">Payment should be made to</p>
                        
                        {method.type === 'bank_transfer' && (
                          <>
                            {(method.details as any)?.account_name && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Account Name: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).account_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).account_name, 'Account Name')}
                                  title="Copy account name"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {(method.details as any)?.bank_name && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Bank Name: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).bank_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).bank_name, 'Bank Name')}
                                  title="Copy bank name"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {(method.details as any)?.account_number && (
                          <div className="flex items-center gap-2">
                                <span className="text-sm">Account No: </span>
                                <span className="font-semibold text-blue-600 font-mono">{(method.details as any).account_number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).account_number, 'Account Number')}
                                  title="Copy account number"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                          </div>
                            )}
                          </>
                        )}

                        {(method.type as string) === 'mobile_money' && (
                          <>
                            {(method.details as any)?.phone_number && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Phone Number: </span>
                                <span className="font-semibold text-blue-600 font-mono">{(method.details as any).phone_number}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).phone_number, 'Phone Number')}
                                  title="Copy phone number"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                          </div>
                        )}
                            {(method.details as any)?.network && (
                          <div>
                                <span className="text-sm">Network: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).network}</span>
                          </div>
                        )}
                            {(method.details as any)?.account_name && (
                          <div className="flex items-center gap-2">
                                <span className="text-sm">Account Name: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).account_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).account_name, 'Account Name')}
                                  title="Copy account name"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                          </div>
                        )}
                      </>
                    )}

                        {method.type === 'crypto' && (
                          <>
                            {(method.details as any)?.wallet_address && (
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                <span className="text-sm">{method.currency}: </span>
                                <span className="font-semibold text-blue-600 font-mono text-xs break-all">
                                  {(method.details as any).wallet_address}
                                </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 flex-shrink-0"
                                  onClick={() => copyToClipboard((method.details as any).wallet_address, 'Wallet Address')}
                                  title="Copy wallet address"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            )}
                            {(method.details as any)?.network && (
                              <div>
                                <span className="text-sm">Network: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).network}</span>
                          </div>
                            )}
                          </>
                        )}

                        {((method.type as string) === 'skrill' || (method.type as string) === 'paypal') && (
                          <>
                            {(method.details as any)?.email && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Email: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).email}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).email, 'Email')}
                                  title="Copy email"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {(method.details as any)?.account_name && (
                          <div className="flex items-center gap-2">
                                <span className="text-sm">Account Name: </span>
                                <span className="font-semibold text-blue-600">{(method.details as any).account_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => copyToClipboard((method.details as any).account_name, 'Account Name')}
                                  title="Copy account name"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                          </div>
                        )}
                      </>
                    )}

                        <div className="border-t border-gray-300 pt-3 mt-3">
                          <p className="text-sm">
                            After successful payment, kindly click on the "I have made payment" button at the bottom of this page.
                        </p>
                      </div>
                      </>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => handlePaymentMethodAction(method)}
                    className={`w-full ${
                      isPaystack
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                    size="lg"
                  >
                    {isPaystack || isOnlinePayment
                      ? `Pay ${currency}${formattedPrice}`
                      : 'I have made payment'
                    }
                  </Button>
                </div>
              )
            })}
                </div>
              )}

        {/* Payment Proof Upload Modal */}
        <Dialog open={showPaymentConfirmation} onOpenChange={setShowPaymentConfirmation}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Payment Proof</DialogTitle>
              <DialogDescription>
                Upload proof of your payment for {selectedPaymentMethod?.name || 'selected payment method'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Payment Proof Upload */}
                <div className="space-y-3">
                  <Label>Payment Proof</Label>
                  {!proofPreview ? (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="proof-upload"
                      />
                      <Label
                        htmlFor="proof-upload"
                        className="cursor-pointer flex flex-col items-center gap-2"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Click to upload payment proof
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG up to 5MB
                        </span>
                      </Label>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={proofPreview}
                        alt="Payment proof preview"
                        className="w-full h-48 object-contain border rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeProof}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

              <div className="rounded-lg bg-blue-50 p-4 text-blue-800 text-sm">
                <p className="font-semibold mb-1">Note:</p>
                <p>
                  After uploading your payment proof, your subscription will be set to pending.
                  An admin will review and confirm your payment to activate your subscription.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentConfirmation(false)
                  setPaymentProof(null)
                  setProofPreview(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                  disabled={!paymentProof || submitting || uploading}
              >
                {submitting || uploading ? (
                  'Processing...'
                ) : (
                    'Submit Payment Proof'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Support Link */}
        {whatsappNumber && (
          <div className="text-center mt-8 text-sm text-gray-600">
            <p className="flex items-center justify-center gap-2">
              Can't find your suitable payment method? Contact support team on{' '}
              <a 
                href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <PageLayout title="Checkout">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

