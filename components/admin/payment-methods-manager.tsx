'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { PaymentMethod } from '@/types'
import { Database } from '@/types/database'
import { Plus, Edit, Trash2, Copy, X, Upload, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { CreditCard } from 'lucide-react'

type PaymentMethodUpdate = Database['public']['Tables']['payment_methods']['Update']
type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert']

type PaymentMethodType = 'bank_transfer' | 'mobile_money' | 'crypto' | 'skrill' | 'paypal' | 'other'

interface Country {
  name: string
  code: string
}

interface PaymentMethodsManagerProps {
  paymentMethods: PaymentMethod[]
}

export function PaymentMethodsManager({ paymentMethods: initialPaymentMethods }: PaymentMethodsManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [loading, setLoading] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [countries, setCountries] = useState<Country[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [availableForAllCountries, setAvailableForAllCountries] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const [methodForm, setMethodForm] = useState({
    name: '',
    type: 'bank_transfer' as PaymentMethodType,
    currency: '',
    details: {} as any,
    is_active: true,
    display_order: 0,
    logo_url: null as string | null,
  })

  // Bank transfer form fields
  const [bankDetails, setBankDetails] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
    instructions: '',
  })

  // Mobile money form fields
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState({
    phone_number: '',
    network: '',
    account_name: '',
    instructions: '',
  })

  // Crypto form fields
  const [cryptoDetails, setCryptoDetails] = useState({
    wallet_address: '',
    network: '',
    instructions: '',
  })

  // Skrill form fields
  const [skrillDetails, setSkrillDetails] = useState({
    email: '',
    account_name: '',
    instructions: '',
  })

  // PayPal form fields
  const [paypalDetails, setPaypalDetails] = useState({
    email: '',
    account_name: '',
    instructions: '',
  })

  // Other payment method form fields
  const [otherDetails, setOtherDetails] = useState({
    custom_fields: {} as Record<string, string>,
    instructions: '',
  })

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true)
      try {
        const response = await fetch('/api/countries')
        if (!response.ok) throw new Error('Failed to fetch countries')
        const data = await response.json()
        setCountries(data)
      } catch (error) {
        console.error('Error fetching countries:', error)
        toast.error('Failed to load countries')
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  const handleCreate = () => {
    setEditingMethod(null)
    setMethodForm({
      name: '',
      type: 'bank_transfer',
      currency: '',
      details: {},
      is_active: true,
      display_order: 0,
      logo_url: null,
    })
    setSelectedCountries([])
    setAvailableForAllCountries(false)
    setLogoFile(null)
    setLogoPreview(null)
    setBankDetails({
      account_name: '',
      account_number: '',
      bank_name: '',
      swift_code: '',
      instructions: 'Please include your email in the transaction reference.',
    })
    setMobileMoneyDetails({
      phone_number: '',
      network: '',
      account_name: '',
      instructions: 'Please include your email in the transaction reference.',
    })
    setCryptoDetails({
      wallet_address: '',
      network: '',
      instructions: 'Send exact amount to the wallet address. Include your email in the memo.',
    })
    setSkrillDetails({
      email: '',
      account_name: '',
      instructions: 'Please include your email in the transaction reference.',
    })
    setPaypalDetails({
      email: '',
      account_name: '',
      instructions: 'Please include your email in the transaction reference.',
    })
    setOtherDetails({
      custom_fields: {},
      instructions: '',
    })
    setShowDialog(true)
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    const methodData = method as any
    
    // Get countries from countries array or fallback to old country field
    const methodCountries = methodData.countries 
      ? (Array.isArray(methodData.countries) ? methodData.countries : JSON.parse(JSON.stringify(methodData.countries)))
      : (methodData.country ? [methodData.country] : [])
    
    // Check if available for all countries (empty array or null means all countries)
    const isAllCountries = methodCountries.length === 0 && !methodData.country
    
    setSelectedCountries(methodCountries)
    setAvailableForAllCountries(isAllCountries)
    setMethodForm({
      name: method.name,
      type: method.type as PaymentMethodType,
      currency: method.currency || '',
      details: method.details as any,
      is_active: method.is_active,
      display_order: method.display_order,
      logo_url: method.logo_url,
    })
    setLogoPreview(method.logo_url || null)

    const details = method.details as any
    if (method.type === 'bank_transfer') {
      setBankDetails({
        account_name: details?.account_name || '',
        account_number: details?.account_number || '',
        bank_name: details?.bank_name || '',
        swift_code: details?.swift_code || '',
        instructions: details?.instructions || '',
      })
    } else if ((method.type as string) === 'mobile_money') {
      setMobileMoneyDetails({
        phone_number: details?.phone_number || '',
        network: details?.network || '',
        account_name: details?.account_name || '',
        instructions: details?.instructions || '',
      })
    } else if (method.type === 'crypto') {
      setCryptoDetails({
        wallet_address: details?.wallet_address || '',
        network: details?.network || '',
        instructions: details?.instructions || '',
      })
    } else if (method.type === 'skrill') {
      setSkrillDetails({
        email: details?.email || '',
        account_name: details?.account_name || '',
        instructions: details?.instructions || '',
      })
    } else if (method.type === 'paypal') {
      setPaypalDetails({
        email: details?.email || '',
        account_name: details?.account_name || '',
        instructions: details?.instructions || '',
      })
    } else {
      setOtherDetails({
        custom_fields: details?.custom_fields || {},
        instructions: details?.instructions || '',
      })
    }
    setShowDialog(true)
  }

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return methodForm.logo_url

    setUploadingLogo(true)
    try {
      const supabase = createClient()
      
      // Validate file
      if (!logoFile.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return null
      }
      
      // Check file size (max 5MB)
      if (logoFile.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return null
      }

      const fileExt = logoFile.name.split('.').pop()?.toLowerCase()
      if (!fileExt || !['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt)) {
        toast.error('Invalid file type. Please upload PNG, JPG, GIF, WEBP, or SVG')
        return null
      }

      // Generate unique filename
      const uniqueId = editingMethod?.id || `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const fileName = `payment-methods/${uniqueId}.${fileExt}`
      
      // Delete old logo if exists (only if editing)
      if (editingMethod?.logo_url) {
        try {
          const oldPath = editingMethod.logo_url.split('/').slice(-2).join('/') // Get last 2 parts (payment-methods/filename)
          if (oldPath && oldPath.startsWith('payment-methods/')) {
            await supabase.storage.from('payment-logos').remove([oldPath])
          }
        } catch (deleteError) {
          // Ignore delete errors - file might not exist
          console.warn('Could not delete old logo:', deleteError)
        }
      }

      // Upload the file
      const { data, error } = await supabase.storage
        .from('payment-logos')
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: false // Don't use upsert for new uploads
        })

      if (error) {
        console.error('Storage upload error:', error)
        // Provide more specific error messages
        if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.message?.includes('violates row-level security')) {
          toast.error('Storage policy missing! Go to Supabase Dashboard → Storage → payment-logos → Policies → Create INSERT policy with: bucket_id = \'payment-logos\'', {
            duration: 10000
          })
          throw error
        } else if (error.message?.includes('duplicate')) {
          // If file exists, try with a new name
          const retryFileName = `payment-methods/${uniqueId}-${Date.now()}.${fileExt}`
          const { data: retryData, error: retryError } = await supabase.storage
            .from('payment-logos')
            .upload(retryFileName, logoFile, {
              cacheControl: '3600',
              upsert: false
            })
          
          if (retryError) throw retryError
          
          const { data: { publicUrl } } = supabase.storage
            .from('payment-logos')
            .getPublicUrl(retryFileName)
          
          return publicUrl
        } else {
          throw error
        }
      }

      // Get public URL (even if data is null, we can still construct the URL)
      const { data: { publicUrl } } = supabase.storage
        .from('payment-logos')
        .getPublicUrl(fileName)

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded file')
      }

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      const errorMessage = error.message || 'Failed to upload logo'
      toast.error(errorMessage.includes('row-level security') || errorMessage.includes('RLS')
        ? 'Storage policy error: Please set up INSERT policy in Supabase Dashboard (Storage > payment-logos > Policies)'
        : `Failed to upload logo: ${errorMessage}`
      )
      return null
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!methodForm.name) {
      toast.error('Payment method name is required')
      return
    }

    // Validate required fields based on type
    if (methodForm.type === 'bank_transfer') {
      if (!bankDetails.account_name || !bankDetails.account_number || !bankDetails.bank_name) {
        toast.error('Please fill in all required bank details')
        return
      }
    } else if (methodForm.type === 'mobile_money') {
      if (!mobileMoneyDetails.phone_number || !mobileMoneyDetails.network || !mobileMoneyDetails.account_name) {
        toast.error('Please fill in all required mobile money details')
        return
      }
    } else if (methodForm.type === 'crypto') {
      if (!cryptoDetails.wallet_address) {
        toast.error('Wallet address is required for crypto payments')
        return
      }
    } else if (methodForm.type === 'skrill') {
      if (!skrillDetails.email || !skrillDetails.account_name) {
        toast.error('Please fill in all required Skrill details')
        return
      }
    } else if (methodForm.type === 'paypal') {
      if (!paypalDetails.email || !paypalDetails.account_name) {
        toast.error('Please fill in all required PayPal details')
        return
      }
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Upload logo if new file selected
      let logoUrl = methodForm.logo_url
      if (logoFile) {
        const uploadedUrl = await uploadLogo()
        if (uploadedUrl) {
          logoUrl = uploadedUrl
        }
      }

      // Build details object based on type
      let details = {}
      if (methodForm.type === 'bank_transfer') {
        details = {
          account_name: bankDetails.account_name,
          account_number: bankDetails.account_number,
          bank_name: bankDetails.bank_name,
          swift_code: bankDetails.swift_code || '',
          instructions: bankDetails.instructions || 'Please include your email in the transaction reference.',
        }
      } else if (methodForm.type === 'mobile_money') {
        details = {
          phone_number: mobileMoneyDetails.phone_number,
          network: mobileMoneyDetails.network,
          account_name: mobileMoneyDetails.account_name,
          instructions: mobileMoneyDetails.instructions || 'Please include your email in the transaction reference.',
        }
      } else if (methodForm.type === 'crypto') {
        details = {
          wallet_address: cryptoDetails.wallet_address,
          network: cryptoDetails.network || (methodForm.currency === 'BTC' ? 'Bitcoin' : 'Ethereum'),
          instructions: cryptoDetails.instructions || 'Send exact amount to the wallet address. Include your email in the memo.',
        }
      } else if (methodForm.type === 'skrill') {
        details = {
          email: skrillDetails.email,
          account_name: skrillDetails.account_name,
          instructions: skrillDetails.instructions || 'Please include your email in the transaction reference.',
        }
      } else if (methodForm.type === 'paypal') {
        details = {
          email: paypalDetails.email,
          account_name: paypalDetails.account_name,
          instructions: paypalDetails.instructions || 'Please include your email in the transaction reference.',
        }
      } else {
        details = {
          custom_fields: otherDetails.custom_fields,
          instructions: otherDetails.instructions || '',
        }
      }

      // Determine countries array - empty means all countries
      const countriesArray = (methodForm.type === 'crypto' || methodForm.type === 'skrill' || availableForAllCountries)
        ? [] 
        : selectedCountries

      const methodData: any = {
        name: methodForm.name,
        type: methodForm.type,
        currency: methodForm.type === 'crypto' ? methodForm.currency : null,
        details: details as any,
        is_active: methodForm.is_active,
        display_order: methodForm.display_order,
        countries: countriesArray.length > 0 ? countriesArray : null,
        logo_url: logoUrl,
      }

      if (editingMethod) {
        // Update existing
        const updateData: any = {
          ...methodData,
          updated_at: new Date().toISOString(),
        }
        const result: any = await supabase
          .from('payment_methods')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', editingMethod.id)
        const { error } = result

        if (error) throw error
        toast.success('Payment method updated successfully!')
      } else {
        // Create new
        const result: any = await supabase
          .from('payment_methods')
          .insert(methodData)
        const { error } = result

        if (error) throw error
        toast.success('Payment method created successfully!')
      }

      setShowDialog(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save payment method')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (methodId: string, isActive: boolean) => {
    try {
      const supabase = createClient()
      const updateData: PaymentMethodUpdate = { 
        is_active: !isActive,
        updated_at: new Date().toISOString(),
      }
      const result: any = await supabase
        .from('payment_methods')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', methodId)
      const { error } = result

      if (error) throw error

      toast.success('Payment method status updated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update payment method')
    }
  }

  const handleDelete = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return

    try {
      const supabase = createClient()
      const result: any = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodId)
      const { error } = result

      if (error) throw error

      toast.success('Payment method deleted successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete payment method')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage payment methods available to users</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </CardHeader>
        <CardContent>
              {paymentMethods.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment methods found. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paymentMethods.map((method) => {
                const methodData = method as any
                const methodCountries = methodData.countries 
                  ? (Array.isArray(methodData.countries) ? methodData.countries : [])
                  : (methodData.country ? [methodData.country] : [])
                
                return (
                  <Card key={method.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4 space-y-3">
                      {/* Logo and Name */}
                      <div className="flex items-center gap-3">
                        {method.logo_url ? (
                          <div className="relative w-12 h-12 flex-shrink-0 border rounded-lg overflow-hidden bg-gray-50">
                            <Image
                              src={method.logo_url}
                              alt={method.name}
                              fill
                              className="object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 flex-shrink-0 border rounded-lg flex items-center justify-center bg-gray-50">
                            <CreditCard className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{method.name}</h3>
                          <Badge variant={method.type === 'crypto' ? 'default' : 'secondary'} className="text-xs mt-1">
                            {method.type === 'bank_transfer' ? 'Bank Transfer' :
                             (method.type as string) === 'mobile_money' ? 'Mobile Money' :
                             method.type === 'crypto' ? 'Crypto' :
                             (method.type as string) === 'skrill' ? 'Skrill' :
                             (method.type as string) === 'paypal' ? 'PayPal' : 'Other'}
                      </Badge>
                        </div>
                      </div>

                      {/* Countries */}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Countries:</p>
                        {method.type === 'crypto' || (method.type as string) === 'skrill' || methodCountries.length === 0 ? (
                          <span className="text-xs text-muted-foreground">All Countries</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {methodCountries.slice(0, 2).map((country: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {country}
                              </Badge>
                            ))}
                            {methodCountries.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{methodCountries.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Key Details */}
                      <div className="space-y-1 text-xs">
                        {method.type === 'bank_transfer' && (method.details as any)?.account_number && (
                          <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Account:</span>
                            <span className="font-mono truncate flex-1">{(method.details as any).account_number}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                              className="h-4 w-4 p-0"
                                  onClick={() => copyToClipboard((method.details as any).account_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                        {(method.type as string) === 'mobile_money' && (method.details as any)?.phone_number && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-mono truncate flex-1">{(method.details as any).phone_number}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => copyToClipboard((method.details as any).phone_number)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                              </div>
                            )}
                        {method.type === 'crypto' && (method.details as any)?.wallet_address && (
                          <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">{method.currency}:</span>
                            <span className="font-mono text-xs truncate flex-1">
                                  {(method.details as any).wallet_address}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                              className="h-4 w-4 p-0"
                                  onClick={() => copyToClipboard((method.details as any).wallet_address)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                        {((method.type as string) === 'skrill' || (method.type as string) === 'paypal') && (method.details as any)?.email && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-mono text-xs truncate flex-1">{(method.details as any).email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0"
                              onClick={() => copyToClipboard((method.details as any).email)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                              </div>
                        )}
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={method.is_active}
                            onCheckedChange={() => handleToggle(method.id, method.is_active)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {method.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                            className="h-7 w-7 p-0"
                          onClick={() => handleEdit(method)}
                        >
                            <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(method.id)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
            </DialogTitle>
            <DialogDescription>
              {editingMethod ? 'Update payment method details' : 'Add a new payment method for users'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={methodForm.name}
                onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                placeholder="e.g., Bank Transfer, Bitcoin"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={methodForm.type}
                onValueChange={(value: PaymentMethodType) => {
                  setMethodForm({ ...methodForm, type: value, currency: value === 'crypto' ? methodForm.currency : '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="skrill">Skrill</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Logo (Optional)</Label>
              {logoPreview ? (
                <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                  <Image
                    src={logoPreview}
                    alt="Logo preview"
                    fill
                    className="object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => {
                      setLogoFile(null)
                      setLogoPreview(methodForm.logo_url)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-4">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoSelect}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload logo</span>
                  </Label>
                </div>
              )}
            </div>

            {methodForm.type === 'crypto' && (
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={methodForm.currency}
                  onValueChange={(value) => setMethodForm({ ...methodForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Country Selection - Multiple tags */}
            {(methodForm.type !== 'crypto' && methodForm.type !== 'skrill') && (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Supported Countries</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={availableForAllCountries}
                      onCheckedChange={(checked) => {
                        setAvailableForAllCountries(checked)
                        if (checked) {
                          setSelectedCountries([])
                        }
                      }}
                    />
                    <Label htmlFor="all-countries" className="text-sm font-normal cursor-pointer">
                      Available for all countries
                    </Label>
                  </div>
                </div>
                {!availableForAllCountries && (
                  <>
                    <div className="border rounded-lg p-3 min-h-[100px]">
                      {selectedCountries.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {selectedCountries.map((country) => (
                            <Badge key={country} variant="secondary" className="flex items-center gap-1">
                              {country}
                              <button
                                type="button"
                                onClick={() => setSelectedCountries(selectedCountries.filter(c => c !== country))}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value && !selectedCountries.includes(value)) {
                            setSelectedCountries([...selectedCountries, value])
                          }
                        }}
                        disabled={availableForAllCountries}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCountries ? "Loading countries..." : "Add country"} />
                        </SelectTrigger>
                        <SelectContent>
                          {countries
                            .filter(c => !selectedCountries.includes(c.name))
                            .map((country) => (
                              <SelectItem key={country.code} value={country.name}>
                                {country.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select countries where this payment method is available. Or enable "Available for all countries" above.
                    </p>
                  </>
                )}
                {availableForAllCountries && (
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <p>This payment method will be available for all countries.</p>
                  </div>
                )}
            </div>
            )}
            {(methodForm.type === 'crypto' || methodForm.type === 'skrill') && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <p>This payment method is available for all countries.</p>
              </div>
            )}

            {methodForm.type === 'bank_transfer' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account Name</Label>
                    <Input
                      id="account_name"
                      value={bankDetails.account_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={bankDetails.account_number}
                      onChange={(e) => setBankDetails({ ...bankDetails, account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={bankDetails.bank_name}
                      onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="swift_code">SWIFT Code (Optional)</Label>
                    <Input
                      id="swift_code"
                      value={bankDetails.swift_code}
                      onChange={(e) => setBankDetails({ ...bankDetails, swift_code: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank_instructions">Instructions</Label>
                  <Textarea
                    id="bank_instructions"
                    value={bankDetails.instructions}
                    onChange={(e) => setBankDetails({ ...bankDetails, instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {methodForm.type === 'mobile_money' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Mobile Money Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number *</Label>
                    <Input
                      id="phone_number"
                      value={mobileMoneyDetails.phone_number}
                      onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, phone_number: e.target.value })}
                      placeholder="e.g., +234 123 456 7890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="network">Network *</Label>
                    <Select
                      value={mobileMoneyDetails.network}
                      onValueChange={(value) => setMobileMoneyDetails({ ...mobileMoneyDetails, network: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">MTN</SelectItem>
                        <SelectItem value="Orange">Orange</SelectItem>
                        <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                        <SelectItem value="Vodafone">Vodafone</SelectItem>
                        <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                        <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                        <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="mobile_account_name">Account Name *</Label>
                    <Input
                      id="mobile_account_name"
                      value={mobileMoneyDetails.account_name}
                      onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, account_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile_instructions">Instructions</Label>
                  <Textarea
                    id="mobile_instructions"
                    value={mobileMoneyDetails.instructions}
                    onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {methodForm.type === 'crypto' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Crypto Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={methodForm.currency}
                    onValueChange={(value) => setMethodForm({ ...methodForm, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                      <SelectItem value="USDT">Tether (USDT)</SelectItem>
                      <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                      <SelectItem value="BNB">Binance Coin (BNB)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wallet_address">Wallet Address *</Label>
                  <Input
                    id="wallet_address"
                    value={cryptoDetails.wallet_address}
                    onChange={(e) => setCryptoDetails({ ...cryptoDetails, wallet_address: e.target.value })}
                    placeholder="Enter wallet address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="network">Network</Label>
                  <Input
                    id="network"
                    value={cryptoDetails.network}
                    onChange={(e) => setCryptoDetails({ ...cryptoDetails, network: e.target.value })}
                    placeholder="e.g., Bitcoin, Ethereum, TRC20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crypto_instructions">Instructions</Label>
                  <Textarea
                    id="crypto_instructions"
                    value={cryptoDetails.instructions}
                    onChange={(e) => setCryptoDetails({ ...cryptoDetails, instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {methodForm.type === 'skrill' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Skrill Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="skrill_email">Email *</Label>
                    <Input
                      id="skrill_email"
                      type="email"
                      value={skrillDetails.email}
                      onChange={(e) => setSkrillDetails({ ...skrillDetails, email: e.target.value })}
                      placeholder="skrill@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skrill_account_name">Account Name *</Label>
                    <Input
                      id="skrill_account_name"
                      value={skrillDetails.account_name}
                      onChange={(e) => setSkrillDetails({ ...skrillDetails, account_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="skrill_instructions">Instructions</Label>
                  <Textarea
                    id="skrill_instructions"
                    value={skrillDetails.instructions}
                    onChange={(e) => setSkrillDetails({ ...skrillDetails, instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {methodForm.type === 'paypal' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">PayPal Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paypal_email">Email *</Label>
                    <Input
                      id="paypal_email"
                      type="email"
                      value={paypalDetails.email}
                      onChange={(e) => setPaypalDetails({ ...paypalDetails, email: e.target.value })}
                      placeholder="paypal@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paypal_account_name">Account Name *</Label>
                    <Input
                      id="paypal_account_name"
                      value={paypalDetails.account_name}
                      onChange={(e) => setPaypalDetails({ ...paypalDetails, account_name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paypal_instructions">Instructions</Label>
                  <Textarea
                    id="paypal_instructions"
                    value={paypalDetails.instructions}
                    onChange={(e) => setPaypalDetails({ ...paypalDetails, instructions: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {methodForm.type === 'other' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Other Payment Method Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="other_instructions">Instructions</Label>
                  <Textarea
                    id="other_instructions"
                    value={otherDetails.instructions}
                    onChange={(e) => setOtherDetails({ ...otherDetails, instructions: e.target.value })}
                    rows={3}
                    placeholder="Enter payment instructions for users"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={methodForm.display_order}
                  onChange={(e) => setMethodForm({ ...methodForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={methodForm.is_active}
                  onCheckedChange={(checked) => setMethodForm({ ...methodForm, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || uploadingLogo}>
              {loading || uploadingLogo ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

