'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PageLayout } from '@/components/layout/page-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Upload, X, Check, Copy } from 'lucide-react'
import { Plan, PlanPrice, Country, PaymentMethod } from '@/types'
import { Database } from '@/types/database'
import { toast } from 'sonner'

type CountryOption = 'Nigeria' | 'Ghana' | 'Kenya' | 'Other'
type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'country'>
type TransactionInsert = Database['public']['Tables']['transactions']['Insert']
type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']
type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planSlug = searchParams.get('plan')
  const durationParam = searchParams.get('duration')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<PlanPrice | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(durationParam ? parseInt(durationParam) : 30)
  const [user, setUser] = useState<any>(null)
  const [userCountry, setUserCountry] = useState<CountryOption>('Nigeria')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false)
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
      const result = await supabase
        .from('users')
        .select('country')
        .eq('id', user.id)
        .maybeSingle()
      
      const userProfile = result.data as UserProfile | null

      if (userProfile?.country && ['Nigeria', 'Ghana', 'Kenya', 'Other'].includes(userProfile.country)) {
        setUserCountry(userProfile.country as CountryOption)
      }

      // Get active payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (methodsData) {
        setPaymentMethods(methodsData)
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
          
          // Get price for selected duration
          const countryName = userProfile?.country || 'Nigeria'
          const { data: pricesData } = await supabase
            .from('plan_prices')
            .select('*')
            .eq('plan_id', planData.id)
            .eq('duration_days', selectedDuration)

          if (pricesData && pricesData.length > 0) {
            // Try to find country-specific price first, then fallback to Nigeria, then any price
            const countryPrice = pricesData.find((p: any) => p.country === countryName)
            if (countryPrice) {
              setSelectedPrice(countryPrice)
            } else {
              const nigeriaPrice = pricesData.find((p: any) => p.country === 'Nigeria')
              setSelectedPrice(nigeriaPrice || pricesData[0])
            }
          }
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [planSlug, selectedDuration, router])

  // Fetch price when duration changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (!plan) return

      const supabase = createClient()
      const result = await supabase
        .from('users')
        .select('country')
        .eq('id', user?.id)
        .maybeSingle()
      
      const userProfile = result.data as UserProfile | null
      const countryName = userProfile?.country || 'Nigeria'
      const { data: pricesData } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('plan_id', plan.id)
        .eq('duration_days', selectedDuration)

      if (pricesData && pricesData.length > 0) {
        // Try to find country-specific price first, then fallback to Nigeria, then any price
        const countryPrice = pricesData.find((p: any) => p.country === countryName)
        if (countryPrice) {
          setSelectedPrice(countryPrice)
        } else {
          const nigeriaPrice = pricesData.find((p: any) => p.country === 'Nigeria')
          setSelectedPrice(nigeriaPrice || pricesData[0])
        }
      }
    }

    if (plan && user) {
      fetchPrice()
    }
  }, [selectedDuration, plan, user])

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

      toast.success('Payment proof submitted! Your subscription will be activated after admin confirmation.')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error submitting payment:', error)
      toast.error(error.message || 'Failed to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  // Determine currency - Naira for Nigeria/Other, others based on country
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
      <PageLayout title="Checkout" subtitle="Complete your subscription">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">Loading...</div>
        </div>
      </PageLayout>
    )
  }

  if (!plan || !selectedPrice) {
    return (
      <PageLayout title="Checkout" subtitle="Complete your subscription">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Invalid plan details</h1>
            <Button asChild>
              <a href="/subscriptions">Back to Subscriptions</a>
            </Button>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="Checkout" subtitle="Complete your subscription">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="font-semibold">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">
                    {selectedDuration === 7 ? '1 Week' : '1 Month'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="text-2xl font-bold text-[#1e40af]">
                    {currency}{selectedPrice.price}
                  </span>
                </div>
                {plan.requires_activation && selectedPrice.activation_fee && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Activation Fee:</span>
                      <span className="font-semibold">
                        {currency}{selectedPrice.activation_fee}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      (Paid separately after subscription)
                    </p>
                  </div>
                )}
              </div>

              {plan.benefits && plan.benefits.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Benefits:</h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {plan.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-[#22c55e] mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Select your payment method and upload proof of payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duration Selection */}
              <div className="space-y-2">
                <Label>Select Duration</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedDuration === 7 ? 'default' : 'outline'}
                    onClick={() => setSelectedDuration(7)}
                    className="flex-1"
                  >
                    1 Week
                  </Button>
                  <Button
                    type="button"
                    variant={selectedDuration === 30 ? 'default' : 'outline'}
                    onClick={() => setSelectedDuration(30)}
                    className="flex-1"
                  >
                    1 Month
                  </Button>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup 
                  value={selectedPaymentMethod?.id || ''} 
                  onValueChange={(value) => {
                    const method = paymentMethods.find(m => m.id === value)
                    setSelectedPaymentMethod(method || null)
                    setShowPaymentConfirmation(false)
                    setPaymentProof(null)
                    setProofPreview(null)
                  }}
                >
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <RadioGroupItem value={method.id} id={method.id} />
                      <Label htmlFor={method.id} className="cursor-pointer flex-1">
                        {method.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Payment Details */}
              {selectedPaymentMethod && !showPaymentConfirmation && (
                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    {selectedPaymentMethod.type === 'bank_transfer' && (
                      <>
                        {(selectedPaymentMethod.details as any)?.account_name && (
                          <div>
                            <span className="font-medium">Account Name: </span>
                            <span>{(selectedPaymentMethod.details as any).account_name}</span>
                          </div>
                        )}
                        {(selectedPaymentMethod.details as any)?.account_number && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Account Number: </span>
                            <span className="font-mono">{(selectedPaymentMethod.details as any).account_number}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                navigator.clipboard.writeText((selectedPaymentMethod.details as any).account_number)
                                toast.success('Account number copied!')
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {(selectedPaymentMethod.details as any)?.bank_name && (
                          <div>
                            <span className="font-medium">Bank: </span>
                            <span>{(selectedPaymentMethod.details as any).bank_name}</span>
                          </div>
                        )}
                        {(selectedPaymentMethod.details as any)?.swift_code && (
                          <div>
                            <span className="font-medium">SWIFT Code: </span>
                            <span className="font-mono">{(selectedPaymentMethod.details as any).swift_code}</span>
                          </div>
                        )}
                      </>
                    )}
                    {selectedPaymentMethod.type === 'crypto' && (
                      <>
                        {(selectedPaymentMethod.details as any)?.wallet_address && (
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">Wallet Address: </span>
                              <span className="font-mono break-all text-xs">{(selectedPaymentMethod.details as any).wallet_address}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText((selectedPaymentMethod.details as any).wallet_address)
                                toast.success('Wallet address copied!')
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {(selectedPaymentMethod.details as any)?.network && (
                          <div>
                            <span className="font-medium">Network: </span>
                            <span>{(selectedPaymentMethod.details as any).network}</span>
                          </div>
                        )}
                      </>
                    )}
                    {(selectedPaymentMethod.details as any)?.instructions && (
                      <div className="pt-2 border-t border-blue-300">
                        <p className="text-xs text-blue-700">
                          <span className="font-medium">Note: </span>
                          {(selectedPaymentMethod.details as any).instructions}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    className="w-full mt-4"
                    onClick={handleConfirmPayment}
                  >
                    I have made payment
                  </Button>
                </div>
              )}

              {/* Payment Proof Upload */}
              {showPaymentConfirmation && selectedPaymentMethod && (
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
              )}

              {/* Submit Button */}
              {showPaymentConfirmation && selectedPaymentMethod && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!paymentProof || submitting || uploading}
                >
                  {submitting || uploading ? (
                    'Processing...'
                  ) : (
                    'Submit Payment Proof'
                  )}
                </Button>
              )}

              <div className="rounded-lg bg-blue-50 p-4 text-blue-800 text-sm">
                <p className="font-semibold mb-1">Note:</p>
                <p>
                  After uploading your payment proof, your subscription will be set to pending.
                  An admin will review and confirm your payment to activate your subscription.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}

