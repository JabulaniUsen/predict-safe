'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plan } from '@/types'
import { Database } from '@/types/database'
import { Plus, Edit, Trash2, X } from 'lucide-react'

type PlanUpdate = Database['public']['Tables']['plans']['Update']

const AVAILABLE_COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'Other'] as const
type CountryOption = typeof AVAILABLE_COUNTRIES[number]

interface PlansManagerProps {
  plans: any[]
  subscriptions: any[]
}

export function PlansManager({ plans, subscriptions }: PlansManagerProps) {
  const [loading, setLoading] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [editingPrice, setEditingPrice] = useState<any>(null)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    benefits: [] as string[],
    requires_activation: false,
    is_active: true,
    max_predictions_per_day: null as number | null,
  })
  const [priceForm, setPriceForm] = useState({
    plan_id: '',
    country: 'Nigeria' as CountryOption,
    duration_days: 7,
    price: '',
    activation_fee: '',
    currency: 'NGN',
  })
  const [newBenefit, setNewBenefit] = useState('')

  const getSubscriberCount = (planId: string) => {
    return subscriptions.filter((s) => s.plan_id === planId && s.plan_status === 'active').length
  }

  const handleTogglePlan = async (planId: string, isActive: boolean) => {
    try {
      const supabase = createClient()
      const updateData: PlanUpdate = { is_active: !isActive }
      const result: any = await supabase
        .from('plans')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', planId)
      const { error } = result

      if (error) throw error

      toast.success('Plan status updated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update plan')
    }
  }

  const handleCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm({
      name: '',
      slug: '',
      description: '',
      benefits: [],
      requires_activation: false,
      is_active: true,
      max_predictions_per_day: null,
    })
    setShowPlanDialog(true)
  }

  const handleEditPlan = (plan: any) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      benefits: plan.benefits || [],
      requires_activation: plan.requires_activation || false,
      is_active: plan.is_active,
      max_predictions_per_day: plan.max_predictions_per_day,
    })
    setShowPlanDialog(true)
  }

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.slug) {
      toast.error('Name and slug are required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      if (editingPlan) {
        // Update existing plan
        const updateData: PlanUpdate = {
          name: planForm.name,
          slug: planForm.slug,
          description: planForm.description,
          benefits: planForm.benefits,
          requires_activation: planForm.requires_activation,
          is_active: planForm.is_active,
          max_predictions_per_day: planForm.max_predictions_per_day,
          updated_at: new Date().toISOString(),
        }
        
        const result: any = await supabase
          .from('plans')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', editingPlan.id)
        const { error } = result

        if (error) throw error
        toast.success('Plan updated successfully!')
      } else {
        // Create new plan
        const insertData: Database['public']['Tables']['plans']['Insert'] = {
          name: planForm.name,
          slug: planForm.slug,
          description: planForm.description,
          benefits: planForm.benefits,
          requires_activation: planForm.requires_activation,
          is_active: planForm.is_active,
          max_predictions_per_day: planForm.max_predictions_per_day,
        }
        const result: any = await supabase
          .from('plans')
          // @ts-expect-error - Supabase type inference issue
          .insert(insertData)
        const { error } = result

        if (error) throw error
        toast.success('Plan created successfully!')
      }

      setShowPlanDialog(false)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save plan')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setPlanForm({
        ...planForm,
        benefits: [...planForm.benefits, newBenefit.trim()],
      })
      setNewBenefit('')
    }
  }

  const handleRemoveBenefit = (index: number) => {
    setPlanForm({
      ...planForm,
      benefits: planForm.benefits.filter((_, i) => i !== index),
    })
  }

  const handleEditPrice = (price: any, planId: string) => {
    setEditingPrice(price)
    const country = price.country || 'Nigeria'
    setPriceForm({
      plan_id: planId,
      country: country as CountryOption,
      duration_days: price.duration_days,
      price: price.price.toString(),
      activation_fee: price.activation_fee?.toString() || '',
      currency: price.currency || (country === 'Other' ? 'NGN' : country === 'Nigeria' ? 'NGN' : country === 'Ghana' ? 'GHS' : country === 'Kenya' ? 'KES' : 'USD'),
    })
    setShowPriceDialog(true)
  }

  const handleCreatePrice = (planId: string) => {
    setEditingPrice(null)
    setPriceForm({
      plan_id: planId,
      country: 'Nigeria' as CountryOption,
      duration_days: 7,
      price: '',
      activation_fee: '',
      currency: 'NGN',
    })
    setShowPriceDialog(true)
  }

  const handleSavePrice = async () => {
    if (!priceForm.plan_id || !priceForm.price) {
      toast.error('Plan and price are required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      
      // Determine currency based on country
      let currency = priceForm.currency
      if (!currency || currency === '') {
        if (priceForm.country === 'Nigeria' || priceForm.country === 'Other') {
          currency = 'NGN'
        } else if (priceForm.country === 'Ghana') {
          currency = 'GHS'
        } else if (priceForm.country === 'Kenya') {
          currency = 'KES'
        } else {
          currency = 'USD'
        }
      }
      
      // Check for duplicate price before creating
      if (!editingPrice) {
        const { data: existingPrice } = await supabase
          .from('plan_prices')
          .select('id')
          .eq('plan_id', priceForm.plan_id)
          .eq('duration_days', priceForm.duration_days)
          .eq('country', priceForm.country)
          .maybeSingle()

        if (existingPrice) {
          const durationText = priceForm.duration_days === 7 ? '1 Week' : '1 Month'
          toast.error(`A price already exists for ${priceForm.country} with ${durationText} duration. Please edit the existing price instead.`)
          setLoading(false)
          return
        }
      } else {
        // When editing, check if another price with same combination exists (excluding current one)
        const { data: existingPrice } = await supabase
          .from('plan_prices')
          .select('id')
          .eq('plan_id', priceForm.plan_id)
          .eq('duration_days', priceForm.duration_days)
          .eq('country', priceForm.country)
          .neq('id', editingPrice.id)
          .maybeSingle()

        if (existingPrice) {
          const durationText = priceForm.duration_days === 7 ? '1 Week' : '1 Month'
          toast.error(`A price already exists for ${priceForm.country} with ${durationText} duration. Please use a different country or duration.`)
          setLoading(false)
          return
        }
      }
      
      const priceData: any = {
        plan_id: priceForm.plan_id,
        country: priceForm.country,
        duration_days: priceForm.duration_days,
        price: parseFloat(priceForm.price),
        currency: currency,
        updated_at: new Date().toISOString(),
      }

      if (priceForm.activation_fee) {
        priceData.activation_fee = parseFloat(priceForm.activation_fee)
      }

      if (editingPrice) {
        // Update existing price
        const updateData: Database['public']['Tables']['plan_prices']['Update'] = priceData
        const result: any = await supabase
          .from('plan_prices')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', editingPrice.id)
        const { error } = result

        if (error) {
          if (error.code === '23505') {
            const durationText = priceForm.duration_days === 7 ? '1 Week' : '1 Month'
            toast.error(`A price already exists for ${priceForm.country} with ${durationText} duration.`)
          } else {
            throw error
          }
          return
        }
        toast.success('Price updated successfully!')
      } else {
        // Create new price
        const { error } = await supabase
          .from('plan_prices')
          .insert(priceData)

        if (error) {
          if (error.code === '23505') {
            const durationText = priceForm.duration_days === 7 ? '1 Week' : '1 Month'
            toast.error(`A price already exists for ${priceForm.country} with ${durationText} duration. Please edit the existing price instead.`)
          } else {
            throw error
          }
          return
        }
        toast.success('Price created successfully!')
      }

      setShowPriceDialog(false)
      window.location.reload()
    } catch (error: any) {
      if (error.code === '23505') {
        const durationText = priceForm.duration_days === 7 ? '1 Week' : '1 Month'
        toast.error(`A price already exists for ${priceForm.country} with ${durationText} duration.`)
      } else {
        toast.error(error.message || 'Failed to save price')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePrice = async (priceId: string) => {
    if (!confirm('Are you sure you want to delete this price?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('plan_prices')
        .delete()
        .eq('id', priceId)

      if (error) throw error
      toast.success('Price deleted successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete price')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription Plans</CardTitle>
              <CardDescription>Manage your subscription plans and pricing</CardDescription>
            </div>
            <Button onClick={handleCreatePlan}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.slug}</CardDescription>
                      </div>
                      <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">
                        {getSubscriberCount(plan.id)} subscribers
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.is_active}
                        onCheckedChange={() => handleTogglePlan(plan.id, plan.is_active)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Plan
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="details">
                    <TabsList>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="prices">Pricing</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-4 mt-4">
                      <div>
                        <Label className="text-sm font-semibold">Description</Label>
                        <p className="text-sm text-gray-600 mt-1">{plan.description || 'No description'}</p>
                      </div>
                      {plan.benefits && plan.benefits.length > 0 && (
                        <div>
                          <Label className="text-sm font-semibold">Benefits</Label>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                            {plan.benefits.map((benefit: string, idx: number) => (
                              <li key={idx}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-semibold">Requires Activation</Label>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.requires_activation ? 'Yes' : 'No'}
                          </p>
                        </div>
                        {plan.max_predictions_per_day && (
                          <div>
                            <Label className="text-sm font-semibold">Max Predictions/Day</Label>
                            <p className="text-sm text-gray-600 mt-1">{plan.max_predictions_per_day}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="prices" className="mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <Label className="text-sm font-semibold">Pricing by Country & Duration</Label>
                          <p className="text-xs text-gray-500 mt-1">
                            Manage prices for different countries and durations. Click Edit to modify prices.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreatePrice(plan.id)}
                          className="bg-[#1e40af] hover:bg-[#1e3a8a]"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Price
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Country</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Price</TableHead>
                              <TableHead>Activation Fee</TableHead>
                              <TableHead>Currency</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {plan.plan_prices && plan.plan_prices.length > 0 ? (
                              plan.plan_prices.map((price: any) => (
                                <TableRow key={price.id}>
                                  <TableCell>
                                    {price.country || 'Nigeria'}
                                  </TableCell>
                                  <TableCell>
                                    {price.duration_days === 7 ? '1 Week' : '1 Month'}
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    <div className="flex items-center gap-1">
                                      <span>{price.currency === 'NGN' || price.currency === 'NG' ? '₦' : price.currency === 'USD' ? '$' : price.currency}</span>
                                      <span>{price.price}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {price.activation_fee
                                      ? (
                                        <div className="flex items-center gap-1">
                                          <span>{price.currency === 'NGN' || price.currency === 'NG' ? '₦' : price.currency === 'USD' ? '$' : price.currency}</span>
                                          <span>{price.activation_fee}</span>
                                        </div>
                                      )
                                      : '-'}
                                  </TableCell>
                                  <TableCell>{price.currency}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditPrice(price, plan.id)}
                                        className="hover:bg-blue-50"
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeletePrice(price.id)}
                                        className="hover:bg-red-50 text-red-600"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500">
                                  No prices configured. Add a price to get started.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan Edit/Create Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update plan details' : 'Create a new subscription plan'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g., Profit Multiplier"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={planForm.slug}
                  onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g., profit-multiplier"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Plan description..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Benefits</Label>
              <div className="flex gap-2">
                <Input
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddBenefit()}
                  placeholder="Add benefit..."
                />
                <Button type="button" onClick={handleAddBenefit}>Add</Button>
              </div>
              {planForm.benefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {planForm.benefits.map((benefit, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {benefit}
                      <button
                        onClick={() => handleRemoveBenefit(idx)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_predictions">Max Predictions Per Day</Label>
                <Input
                  id="max_predictions"
                  type="number"
                  value={planForm.max_predictions_per_day || ''}
                  onChange={(e) => setPlanForm({
                    ...planForm,
                    max_predictions_per_day: e.target.value ? parseInt(e.target.value) : null,
                  })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requires_activation"
                  checked={planForm.requires_activation}
                  onChange={(e) => setPlanForm({ ...planForm, requires_activation: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="requires_activation">Requires Activation Fee</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={planForm.is_active}
                  onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={loading}>
              {loading ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Edit/Create Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Edit Price' : 'Add New Price'}</DialogTitle>
            <DialogDescription>
              {editingPrice ? 'Update pricing details' : 'Set pricing for this plan'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={priceForm.country}
                onValueChange={(value) => {
                  let currency = 'NGN' // Default for Nigeria/Other
                  if (value === 'Ghana') {
                    currency = 'GHS'
                  } else if (value === 'Kenya') {
                    currency = 'KES'
                  } else if (value === 'Nigeria' || value === 'Other') {
                    currency = 'NGN'
                  }
                  
                  setPriceForm({
                    ...priceForm,
                    country: value as CountryOption,
                    currency: currency,
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nigeria">Nigeria (₦)</SelectItem>
                  <SelectItem value="Ghana">Ghana (₵)</SelectItem>
                  <SelectItem value="Kenya">Kenya (KSh)</SelectItem>
                  <SelectItem value="Other">Other (₦)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Select
                value={priceForm.duration_days.toString()}
                onValueChange={(value) => setPriceForm({ ...priceForm, duration_days: parseInt(value) })}
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
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={priceForm.currency}
                onValueChange={(value) => setPriceForm({ ...priceForm, currency: value })}
                disabled={true}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={priceForm.currency}>
                    {priceForm.currency === 'NGN' && '₦'}
                    {priceForm.currency === 'GHS' && '₵'}
                    {priceForm.currency === 'KES' && 'KSh'}
                    {priceForm.currency === 'USD' && '$'}
                    {priceForm.currency} ({priceForm.currency === 'NGN' ? '₦' : priceForm.currency === 'GHS' ? '₵' : priceForm.currency === 'KES' ? 'KSh' : '$'})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-blue-600">
                Currency automatically set based on selected country
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {priceForm.currency === 'NGN' || priceForm.currency === 'NG' ? '₦' : priceForm.currency === 'USD' ? '$' : priceForm.currency}
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceForm.price}
                    onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activation_fee">Activation Fee (Optional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {priceForm.currency === 'NGN' || priceForm.currency === 'NG' ? '₦' : priceForm.currency === 'USD' ? '$' : priceForm.currency}
                  </span>
                  <Input
                    id="activation_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceForm.activation_fee}
                    onChange={(e) => setPriceForm({ ...priceForm, activation_fee: e.target.value })}
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrice} disabled={loading}>
              {loading ? 'Saving...' : editingPrice ? 'Update Price' : 'Create Price'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
