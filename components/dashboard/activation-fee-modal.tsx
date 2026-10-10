'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Upload, X, Check, Copy } from 'lucide-react'
import { PaymentMethod, PlanPrice } from '@/types'
import { toast } from 'sonner'
import Image from 'next/image'
import { Combobox } from '@/components/ui/combobox'
import { getCurrencyFromCountry, getCurrencySymbol as getCurrencySymbolUtil } from '@/lib/utils/currency'
import { isMethodAvailableForCountry } from '@/lib/payment-methods'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'

const mapCountryToOption = (countryName: string): CountryOption => {
  if (countryName === 'Nigeria') return 'Nigeria'
  if (countryName === 'Ghana') return 'Ghana'
  if (countryName === 'Kenya') return 'Kenya'
  return 'Other'
}

interface ActivationFeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  planName: string
  subscriptionId: string
}

export function ActivationFeeModal({
  open,
  onOpenChange,
  planId,
  planName,
  subscriptionId,
}: ActivationFeeModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [activationPrice, setActivationPrice] = useState<PlanPrice | null>(null)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  // No default country — the user must actively pick one so the price and
  // currency shown are never a silent guess (this used to fall back to
  // 'Nigeria', which showed a wrong/zero fee before the user chose anything).
  const [selectedCountry, setSelectedCountry] = useState<string>('')
  const [countries, setCountries] = useState<Array<{ value: string; label: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
  const [durationDays, setDurationDays] = useState<number>(30)
  const [availableDurations, setAvailableDurations] = useState<number[]>([])

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
        toast.error('Failed to load countries')
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    if (open) {
      setSelectedCountry('')
      fetchDurationsAndDefault()
      fetchData()
    }
  }, [open, planId, subscriptionId])

  // Figure out which durations this plan sells an activation fee for, and
  // which one to default to. The subscription's own dates are usually still
  // null at this stage (they're only set when the admin activates), so the
  // most reliable default is the duration of the original subscription
  // purchase — otherwise a weekly subscriber would be shown (and charged)
  // the monthly activation fee.
  const fetchDurationsAndDefault = async () => {
    const supabase = createClient()
    try {
      const { data: activationPrices } = await supabase
        .from('plan_prices')
        .select('duration_days')
        .eq('plan_id', planId)
        .not('activation_fee', 'is', null)
        .gt('activation_fee', 0)

      const durations = Array.from(
        new Set(
          ((activationPrices as Array<{ duration_days: number }> | null) || [])
            .map((p) => p.duration_days)
            .filter((d): d is number => typeof d === 'number')
        )
      ).sort((a, b) => a - b)
      setAvailableDurations(durations)

      let candidate: number | null = null

      // 1. Duration of the original subscription purchase for this subscription
      try {
        const txResponse = (await supabase
          .from('transactions')
          .select('metadata')
          .eq('subscription_id', subscriptionId)
          .eq('payment_type', 'subscription')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as unknown as { data: { metadata: unknown } | null }

        const txDuration = (txResponse?.data?.metadata as { duration_days?: unknown } | null)?.duration_days
        if (typeof txDuration === 'number' && txDuration > 0) {
          candidate = txDuration
        }
      } catch {
        // RLS or missing link — fall through to the date-based default
      }

      // 2. Derive from the subscription's own dates when available
      if (candidate === null) {
        try {
          const { data: subscriptionData } = await supabase
            .from('user_subscriptions')
            .select('start_date, expiry_date')
            .eq('id', subscriptionId)
            .single()

          const subscription = subscriptionData as { start_date: string | null; expiry_date: string | null } | null

          if (subscription?.start_date && subscription?.expiry_date) {
            const start = new Date(subscription.start_date)
            const expiry = new Date(subscription.expiry_date)
            const days = Math.ceil((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            // Round to nearest valid duration (7 or 30)
            candidate = days <= 14 ? 7 : 30
          }
        } catch {
          // fall through to default below
        }
      }

      // 3. Final default: monthly
      if (candidate === null) candidate = 30

      // Only offer durations the plan actually sells an activation fee for
      if (durations.length > 0 && !durations.includes(candidate)) {
        candidate = durations.includes(30) ? 30 : durations[0]
      }

      setDurationDays(candidate)
    } catch (error) {
      console.error('Error fetching activation durations:', error)
      // Default to 30 days on error
      setDurationDays(30)
    }
  }

  // Fetch payment methods when country changes
  useEffect(() => {
    if (open) {
      fetchPaymentMethods()
    }
  }, [selectedCountry, open])

  // Update activation price when country or duration changes
  useEffect(() => {
    if (open) {
      fetchActivationPrice()
    }
  }, [selectedCountry, planId, durationDays, open])

  // Ensure a payment method is selected when payment methods are loaded
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPaymentMethod) {
      setSelectedPaymentMethod(paymentMethods[0])
    }
  }, [paymentMethods, selectedPaymentMethod])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchPaymentMethods(), fetchActivationPrice()])
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentMethods = async () => {
    const supabase = createClient()
    try {
      // Get active payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (methodsData) {
        // Filter payment methods based on selected country
        // (Shared helper: missing/NULL/empty countries = all countries;
        // crypto and Skrill are always available.)
        const filteredMethods: PaymentMethod[] = methodsData.filter((method: any) =>
          isMethodAvailableForCountry(method, selectedCountry)
        ) as PaymentMethod[]

        setPaymentMethods(filteredMethods)
        // Reset selected payment method if it's not in the filtered list
        setSelectedPaymentMethod((current) => {
          // If current method is not in filtered list, select first available
          if (current && !filteredMethods.find((m: PaymentMethod) => m.id === current.id)) {
            const firstMethod = filteredMethods.length > 0 ? filteredMethods[0] : null
            return firstMethod
          }
          // If no current method, select first available
          if (!current && filteredMethods.length > 0) {
            return filteredMethods[0]
          }
          // Keep current method if it's still available
          return current
        })
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      toast.error('Failed to load payment methods')
    }
  }

  const fetchActivationPrice = async () => {
    const supabase = createClient()
    try {
      if (!selectedCountry) {
        setActivationPrice(null)
        return
      }

      // Get all prices for this plan and duration
      const { data: pricesData } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('plan_id', planId)
        .eq('duration_days', durationDays)

      if (!pricesData || pricesData.length === 0) {
        setActivationPrice(null)
        return
      }

      // Filter prices that have activation fees
      const pricesWithActivationFee = pricesData.filter((p: any) => p.activation_fee != null && p.activation_fee > 0)

      if (pricesWithActivationFee.length === 0) {
        setActivationPrice(null)
        return
      }

      // First, try to find exact country match
      const exactMatch = pricesWithActivationFee.find(
        (p: any) => p.duration_days === durationDays && p.country === selectedCountry
      )
      if (exactMatch) {
        setActivationPrice(exactMatch as PlanPrice)
        return
      }

      // If Nigeria, look for Nigeria-specific price
      if (selectedCountry === 'Nigeria') {
        const nigeriaPrice = pricesWithActivationFee.find(
          (p: any) => p.duration_days === durationDays && p.country === 'Nigeria'
        )
        if (nigeriaPrice) {
          setActivationPrice(nigeriaPrice as PlanPrice)
          return
        }
      }

      // For all other countries, look for USD prices (country = 'Other' or currency = 'USD')
      const usdPrice = pricesWithActivationFee.find(
        (p: any) => p.duration_days === durationDays && (p.currency === 'USD' || p.country === 'Other')
      )
      if (usdPrice) {
        setActivationPrice(usdPrice as PlanPrice)
        return
      }

      // Fallback: try to find any price for this duration with matching currency
      const matchingCurrency = selectedCountry === 'Nigeria' ? 'NGN' : 'USD'
      const currencyPrice = pricesWithActivationFee.find(
        (p: any) => p.duration_days === durationDays && p.currency === matchingCurrency
      )
      if (currencyPrice) {
        setActivationPrice(currencyPrice as PlanPrice)
        return
      }

      // Final fallback: any price with activation fee for this duration
      const anyPrice = pricesWithActivationFee.find(
        (p: any) => p.duration_days === durationDays
      )
      if (anyPrice) {
        setActivationPrice(anyPrice as PlanPrice)
        return
      }

      // No activation fee found
      setActivationPrice(null)
    } catch (error) {
      console.error('Error fetching activation price:', error)
      setActivationPrice(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setPaymentProof(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setProofPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveProof = () => {
    setPaymentProof(null)
    setProofPreview(null)
  }

  const durationLabel = (days: number) =>
    days === 7 ? 'Weekly' : days === 30 ? 'Monthly' : `${days} days`

  const handleDurationChange = (days: number) => {
    if (days === durationDays) return
    setDurationDays(days)
    // The fee changes with duration — the old proof is for the wrong amount
    setPaymentProof(null)
    setProofPreview(null)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleSubmit = async () => {
    // Validate payment method
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    // Validate activation price
    if (!activationPrice) {
      toast.error('Activation fee not available for the selected country. Please contact support.')
      return
    }

    // Validate payment proof
    if (!paymentProof) {
      toast.error('Please upload proof of payment')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      // Upload proof of payment via the server route: it uses the
      // service-role client so it works even when storage RLS policies were
      // never created in the dashboard (the usual cause of
      // "Unable to upload image"), and it auto-creates the private
      // payment-proofs bucket.
      setUploading(true)
      const formData = new FormData()
      formData.append('file', paymentProof)
      formData.append('subscriptionId', subscriptionId)

      const uploadResponse = await fetch('/api/payment-proofs/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadResult = await uploadResponse.json()
      if (!uploadResponse.ok) {
        console.error('Storage upload error:', uploadResult?.error)
        toast.error(uploadResult?.error || 'Failed to upload payment proof. Please try again.')
        setUploading(false)
        setSubmitting(false)
        return
      }

      const proofUrl: string = uploadResult.url
      const proofPath: string | null = uploadResult.path ?? null

      // Create transaction record
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase type inference issue
        .insert({
          user_id: user.id,
          subscription_id: subscriptionId,
          plan_id: planId,
          amount: activationPrice.activation_fee!,
          currency: activationPrice.currency,
          payment_gateway: selectedPaymentMethod.name,
          payment_type: 'activation',
          status: 'pending',
          metadata: {
            payment_proof_url: proofUrl,
            payment_proof_path: proofPath,
            duration_days: durationDays,
            payment_method_id: selectedPaymentMethod.id,
            payment_method_name: selectedPaymentMethod.name,
            payment_method_type: selectedPaymentMethod.type,
          },
        })
        .select()
        .single()

      if (txError) throw txError

      // Notify admin about the new activation-fee payment submission
      try {
        const adminResult: any = await supabase
          .from('users')
          .select('id')
          .eq('is_admin', true)
          .limit(1)
          .single()
        const adminUser = adminResult.data as any

        if (adminUser) {
          const userProfileResult: any = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', user.id)
            .single()
          const userProfile = userProfileResult.data as any
          const userName = userProfile?.full_name || user.email?.split('@')[0] || 'User'
          const userEmail = userProfile?.email || user.email

          await supabase
            .from('notifications')
            // @ts-expect-error - Supabase type inference issue
            .insert({
              user_id: adminUser.id,
              type: 'admin_new_payment',
              title: 'New Activation Fee Payment Submitted',
              message: `${userName} (${userEmail}) has submitted an activation fee payment proof for ${planName}. Amount: ${activationPrice.currency} ${activationPrice.activation_fee}.`,
              read: false,
            })

          try {
            await fetch('/api/notifications/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'admin_new_payment',
                userId: adminUser.id,
                planName,
                userEmail,
                userName,
                amount: activationPrice.activation_fee,
                currency: activationPrice.currency,
              }),
            })
          } catch (emailError) {
            console.error('Error sending admin notification email:', emailError)
          }
        }
      } catch (notifError) {
        console.error('Error creating admin notification:', notifError)
        // Don't throw - the payment submission itself already succeeded
      }

      toast.success('Payment proof submitted! Awaiting admin approval.')
      onOpenChange(false)
      
      // Reset form
      setPaymentProof(null)
      setProofPreview(null)
      setSelectedPaymentMethod(paymentMethods[0] || null)
    } catch (error: any) {
      console.error('Error submitting payment:', error)
      toast.error(error.message || 'Failed to submit payment proof')
    } finally {
      setUploading(false)
      setSubmitting(false)
    }
  }

  // Get currency symbol from the selected price's currency field in the database
  // Same logic as subscriptions page
  const getCurrencySymbol = (selectedPrice: any) => {
    // First priority: Use currency code from database if available
    if (selectedPrice?.currency && typeof selectedPrice.currency === 'string' && selectedPrice.currency.trim()) {
      const symbol = getCurrencySymbolUtil(selectedPrice.currency.trim())
      if (symbol && symbol !== selectedPrice.currency) {
        return symbol
    }
      // If utility returns the code itself, it means it's not in the map, return it as-is
      return symbol
    }

    // Second priority: Infer currency from country name if currency not set
    if (selectedPrice?.country && typeof selectedPrice.country === 'string' && selectedPrice.country.trim()) {
      const countryCurrencyCode = getCurrencyFromCountry(selectedPrice.country.trim())
      if (countryCurrencyCode) {
        const symbol = getCurrencySymbolUtil(countryCurrencyCode)
        return symbol
      }
    }

    // Third priority: Use selected country to infer currency
    if (selectedCountry && typeof selectedCountry === 'string' && selectedCountry.trim()) {
      const userCountryCurrencyCode = getCurrencyFromCountry(selectedCountry.trim())
      if (userCountryCurrencyCode) {
        const symbol = getCurrencySymbolUtil(userCountryCurrencyCode)
        return symbol
      }
    }

    // Final fallback: Default to USD
    return '$'
  }

  const currency = getCurrencySymbol(activationPrice)
  const amount = activationPrice?.activation_fee || 0
  const formattedAmount = typeof amount === 'number' 
    ? amount 
    : parseFloat(String(amount || '0'))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pay Activation Fee - {planName}</DialogTitle>
          <DialogDescription>
            Complete your activation by paying the activation fee and uploading proof of payment.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">Loading payment information...</div>
        ) : (
          <div className="space-y-6">
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
            </div>

            {!selectedCountry ? (
              <div className="text-center py-8 text-gray-500 border rounded-lg">
                Select your country above to see the activation fee, currency, and available payment methods.
              </div>
            ) : (
              <>
                {/* Duration Selection - Weekly or Monthly activation */}
                {availableDurations.length > 1 && (
                  <div className="space-y-2">
                    <Label>Select Duration</Label>
                    <div className="inline-flex items-center gap-2 bg-white p-1 rounded-lg border-2 border-gray-200 shadow-sm">
                      {availableDurations.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => handleDurationChange(days)}
                          className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold transition-all ${
                            durationDays === days
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          {durationLabel(days)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amount Display */}
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-1">
                    Activation Fee{availableDurations.length > 0 ? ` (${durationLabel(durationDays)})` : ''}
                  </p>
                  {activationPrice ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-blue-600">{currency}</span>
                      <span className="text-4xl font-bold text-blue-600">
                        {formattedAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600">
                      Activation fee not available for {selectedCountry}. Please contact support.
                    </p>
                  )}
                </div>

                {/* Payment Methods */}
                {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                <Label>Select Payment Method *</Label>
                {!selectedPaymentMethod && paymentMethods.length > 0 && (
                  <p className="text-sm text-amber-600">Please select a payment method above</p>
                )}
                <RadioGroup
                  value={selectedPaymentMethod?.id || ''}
                  onValueChange={(value) => {
                    const method = paymentMethods.find((m) => m.id === value)
                    if (method) {
                      setSelectedPaymentMethod(method)
                    }
                  }}
                >
                  {paymentMethods.map((method) => {
                    const details = method.details as any
                    return (
                      <div
                        key={method.id}
                        className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                        <Label
                          htmlFor={method.id}
                          className="flex-1 cursor-pointer space-y-2"
                        >
                          <div className="font-semibold">{method.name}</div>
                          {method.type === 'bank_transfer' && details && (
                            <div className="text-sm text-gray-600 space-y-1">
                              {details.account_name && (
                                <div className="flex items-center gap-2">
                                  <span>Account Name:</span>
                                  <span className="font-medium">{details.account_name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(details.account_name)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {details.account_number && (
                                <div className="flex items-center gap-2">
                                  <span>Account Number:</span>
                                  <span className="font-medium">{details.account_number}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(details.account_number)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {details.bank_name && (
                                <div>
                                  <span>Bank: </span>
                                  <span className="font-medium">{details.bank_name}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {method.type === 'crypto' && details && (
                            <div className="text-sm text-gray-600 space-y-1">
                              {details.wallet_address && (
                                <div className="flex items-center gap-2">
                                  <span>Wallet Address:</span>
                                  <span className="font-mono text-xs break-all">{details.wallet_address}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(details.wallet_address)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {details.network && (
                                <div>
                                  <span>Network: </span>
                                  <span className="font-medium">{details.network}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {details?.instructions && (
                            // Saved by the admin per payment method but never
                            // previously shown to the user paying.
                            <div className="mt-2 rounded-md bg-blue-50 border border-blue-100 p-2">
                              <p className="text-xs font-semibold text-blue-900 mb-0.5">
                                Payment instructions
                              </p>
                              <p className="text-xs text-blue-900/90 whitespace-pre-line">
                                {details.instructions}
                              </p>
                            </div>
                          )}
                          {(method as any).payment_link && (
                            <a
                              href={(method as any).payment_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-block text-sm text-blue-600 hover:text-blue-800 underline mt-1"
                            >
                              Open Payment Page
                            </a>
                          )}
                        </Label>
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No payment methods available. Please contact support.
              </div>
            )}

            {/* Payment Proof Upload */}
            <div className="space-y-3">
              <Label>Upload Proof of Payment *</Label>
              {!proofPreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                    <Upload className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-400">
                      PNG, JPG up to 5MB
                    </span>
                  </Label>
                </div>
              ) : (
                <div className="relative border rounded-lg p-4">
                  <div className="relative w-full h-48 mb-2">
                    <Image
                      src={proofPreview}
                      alt="Payment proof"
                      fill
                      className="object-contain rounded"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveProof}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {(selectedPaymentMethod as any)?.payment_link && (
            <Button asChild variant="outline"
              className="border-blue-600 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <a
                href={(selectedPaymentMethod as any).payment_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Click to Make Payment
              </a>
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!selectedPaymentMethod || !activationPrice || !paymentProof || submitting || uploading}
          >
            {submitting || uploading ? 'Submitting...' : 'Submit Payment Proof'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

