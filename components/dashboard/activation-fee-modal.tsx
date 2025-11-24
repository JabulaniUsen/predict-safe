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

interface ActivationFeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  planName: string
  userCountry: string
  subscriptionId: string
}

export function ActivationFeeModal({
  open,
  onOpenChange,
  planId,
  planName,
  userCountry,
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

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, planId, userCountry])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Get active payment methods
      const { data: methodsData } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (methodsData) {
        setPaymentMethods(methodsData)
        if (methodsData.length > 0) {
          setSelectedPaymentMethod(methodsData[0])
        }
      }

      // Get activation fee price
      const { data: priceData } = await supabase
        .from('plan_prices')
        .select('*')
        .eq('plan_id', planId)
        .eq('country', userCountry)
        .single()

      if (priceData && (priceData as PlanPrice).activation_fee) {
        setActivationPrice(priceData as PlanPrice)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load payment information')
    } finally {
      setLoading(false)
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const handleSubmit = async () => {
    if (!selectedPaymentMethod || !activationPrice) {
      toast.error('Please select a payment method')
      return
    }

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

      // Upload proof of payment
      const fileExt = paymentProof.name.split('.').pop()
      const fileName = `${user.id}/${subscriptionId}_${Date.now()}.${fileExt}`
      
      setUploading(true)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProof, {
          cacheControl: '3600',
          upsert: false
        })

      let proofUrl: string | null = null
      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        toast.error('Failed to upload payment proof. Please try again.')
        setUploading(false)
        setSubmitting(false)
        return
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName)
        proofUrl = publicUrl
      }

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
            payment_method_id: selectedPaymentMethod.id,
            payment_method_name: selectedPaymentMethod.name,
            payment_method_type: selectedPaymentMethod.type,
          },
        })
        .select()
        .single()

      if (txError) throw txError

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

  const getCurrencySymbol = () => {
    if (userCountry === 'Nigeria' || userCountry === 'Other') return '₦'
    if (userCountry === 'Ghana') return '₵'
    if (userCountry === 'Kenya') return 'KSh'
    return activationPrice?.currency || '₦'
  }

  const currency = getCurrencySymbol()
  const amount = activationPrice?.activation_fee || 0

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
            {/* Amount Display */}
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Activation Fee</p>
              <p className="text-3xl font-bold text-blue-600">
                {currency}
                {amount}
              </p>
            </div>

            {/* Payment Methods */}
            {paymentMethods.length > 0 ? (
              <div className="space-y-3">
                <Label>Select Payment Method</Label>
                <RadioGroup
                  value={selectedPaymentMethod?.id || ''}
                  onValueChange={(value) => {
                    const method = paymentMethods.find((m) => m.id === value)
                    setSelectedPaymentMethod(method || null)
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
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedPaymentMethod || !paymentProof || submitting || uploading}
          >
            {submitting || uploading ? 'Submitting...' : 'Submit Payment Proof'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

