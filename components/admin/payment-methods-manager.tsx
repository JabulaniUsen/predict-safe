'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Plus, Edit, Trash2, Copy } from 'lucide-react'

type PaymentMethodUpdate = Database['public']['Tables']['payment_methods']['Update']
type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert']

const AVAILABLE_COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'Other'] as const
type CountryOption = typeof AVAILABLE_COUNTRIES[number]

interface PaymentMethodsManagerProps {
  paymentMethods: PaymentMethod[]
}

export function PaymentMethodsManager({ paymentMethods: initialPaymentMethods }: PaymentMethodsManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(initialPaymentMethods)
  const [loading, setLoading] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [methodForm, setMethodForm] = useState({
    name: '',
    type: 'bank_transfer' as 'bank_transfer' | 'crypto',
    currency: '',
    details: {} as any,
    is_active: true,
    display_order: 0,
    country: '' as CountryOption | '',
  })

  // Bank transfer form fields
  const [bankDetails, setBankDetails] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
    instructions: '',
  })

  // Crypto form fields
  const [cryptoDetails, setCryptoDetails] = useState({
    wallet_address: '',
    network: '',
    instructions: '',
  })

  const handleCreate = () => {
    setEditingMethod(null)
    setMethodForm({
      name: '',
      type: 'bank_transfer',
      currency: '',
      details: {},
      is_active: true,
      display_order: 0,
      country: '',
    })
    setBankDetails({
      account_name: '',
      account_number: '',
      bank_name: '',
      swift_code: '',
      instructions: 'Please include your email in the transaction reference.',
    })
    setCryptoDetails({
      wallet_address: '',
      network: '',
      instructions: 'Send exact amount to the wallet address. Include your email in the memo.',
    })
    setShowDialog(true)
  }

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method)
    setMethodForm({
      name: method.name,
      type: method.type,
      currency: method.currency || '',
      details: method.details as any,
      is_active: method.is_active,
      display_order: method.display_order,
      country: ((method as any).country as CountryOption) || '',
    })

    if (method.type === 'bank_transfer') {
      setBankDetails({
        account_name: (method.details as any)?.account_name || '',
        account_number: (method.details as any)?.account_number || '',
        bank_name: (method.details as any)?.bank_name || '',
        swift_code: (method.details as any)?.swift_code || '',
        instructions: (method.details as any)?.instructions || '',
      })
    } else {
      setCryptoDetails({
        wallet_address: (method.details as any)?.wallet_address || '',
        network: (method.details as any)?.network || '',
        instructions: (method.details as any)?.instructions || '',
      })
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!methodForm.name) {
      toast.error('Payment method name is required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      // Build details object based on type
      let details = {}
      if (methodForm.type === 'bank_transfer') {
        details = {
          account_name: bankDetails.account_name,
          account_number: bankDetails.account_number,
          bank_name: bankDetails.bank_name,
          swift_code: bankDetails.swift_code,
          instructions: bankDetails.instructions || 'Please include your email in the transaction reference.',
        }
      } else {
        if (!cryptoDetails.wallet_address) {
          toast.error('Wallet address is required for crypto payments')
          setLoading(false)
          return
        }
        details = {
          wallet_address: cryptoDetails.wallet_address,
          network: cryptoDetails.network || (methodForm.currency === 'BTC' ? 'Bitcoin' : 'Ethereum'),
          instructions: cryptoDetails.instructions || 'Send exact amount to the wallet address. Include your email in the memo.',
        }
      }

      const methodData: any = {
        name: methodForm.name,
        type: methodForm.type,
        currency: methodForm.type === 'crypto' ? methodForm.currency : null,
        details: details as any,
        is_active: methodForm.is_active,
        display_order: methodForm.display_order,
        country: methodForm.country || null,
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No payment methods found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-medium">{method.name}</TableCell>
                    <TableCell>
                      <Badge variant={method.type === 'crypto' ? 'default' : 'secondary'}>
                        {method.type === 'crypto' ? 'Crypto' : 'Bank Transfer'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(method as any).country ? (
                        <Badge variant="outline">{(method as any).country}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All Countries</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        {method.type === 'bank_transfer' && (
                          <>
                            {(method.details as any)?.account_number && (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Account:</span>
                                <span className="font-mono">{(method.details as any).account_number}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => copyToClipboard((method.details as any).account_number)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {(method.details as any)?.bank_name && (
                              <div>
                                <span className="text-muted-foreground">Bank: </span>
                                <span>{(method.details as any).bank_name}</span>
                              </div>
                            )}
                          </>
                        )}
                        {method.type === 'crypto' && (
                          <>
                            {(method.details as any)?.wallet_address && (
                              <div className="flex items-center gap-2 max-w-xs">
                                <span className="text-muted-foreground">{method.currency}:</span>
                                <span className="font-mono text-xs truncate">
                                  {(method.details as any).wallet_address}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => copyToClipboard((method.details as any).wallet_address)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {(method.details as any)?.network && (
                              <div>
                                <span className="text-muted-foreground">Network: </span>
                                <span>{(method.details as any).network}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={method.is_active}
                        onCheckedChange={() => handleToggle(method.id, method.is_active)}
                      />
                    </TableCell>
                    <TableCell>{method.display_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(method)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(method.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
                onValueChange={(value: 'bank_transfer' | 'crypto') => {
                  setMethodForm({ ...methodForm, type: value, currency: value === 'crypto' ? methodForm.currency : '' })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                </SelectContent>
              </Select>
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

            {/* Country Selection */}
            <div className="space-y-2">
              <Label htmlFor="country">Country (Optional)</Label>
              <Select
                value={methodForm.country || 'all'}
                onValueChange={(value) => setMethodForm({ ...methodForm, country: value === 'all' ? '' : value as CountryOption })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country (leave empty for all countries)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {AVAILABLE_COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a country to restrict this payment method to that country only. Leave empty to make it available for all countries.
              </p>
            </div>

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

            {methodForm.type === 'crypto' && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold">Crypto Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="wallet_address">Wallet Address</Label>
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
                    placeholder="e.g., Bitcoin, Ethereum"
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
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : editingMethod ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

