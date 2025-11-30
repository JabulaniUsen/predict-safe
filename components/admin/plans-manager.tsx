'use client'

import { useState, useEffect } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { Plus, Edit, Trash2, X, Search } from 'lucide-react'
import { getCurrencyFromCountry, getCurrencySymbol } from '@/lib/utils/currency'

type PlanUpdate = Database['public']['Tables']['plans']['Update']

interface PlansManagerProps {
  plans: any[]
  subscriptions: any[]
}

interface CountryPrice {
  country: string
  currency: string
  price_7d: string
  price_30d: string
  activation_fee_7d: string
  activation_fee_30d: string
  selected: boolean
}

export function PlansManager({ plans, subscriptions }: PlansManagerProps) {
  const [loading, setLoading] = useState(false)
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [editingPrice, setEditingPrice] = useState<any>(null)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showPriceDialog, setShowPriceDialog] = useState(false)
  const [countries, setCountries] = useState<Array<{ name: string; code: string }>>([])
  const [loadingCountries, setLoadingCountries] = useState(true)
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
    country: 'Nigeria',
    duration_days: 7,
    price: '',
    activation_fee: '',
    currency: 'NGN',
  })
  const [newBenefit, setNewBenefit] = useState('')
  const [countryPrices, setCountryPrices] = useState<Record<string, CountryPrice>>({})
  const [othersPrice, setOthersPrice] = useState({
    price_7d: '',
    price_30d: '',
    activation_fee_7d: '',
    activation_fee_30d: '',
  })
  const [countrySearch, setCountrySearch] = useState('')

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        setLoadingCountries(true)
        const response = await fetch('/api/countries')
        if (!response.ok) throw new Error('Failed to fetch countries')
        const data = await response.json()
        setCountries(data)
      } catch (error) {
        console.error('Error fetching countries:', error)
        // Fallback to basic countries
        setCountries([
          { name: 'Nigeria', code: 'NG' },
          { name: 'Ghana', code: 'GH' },
          { name: 'Kenya', code: 'KE' },
          { name: 'Other', code: 'XX' },
        ])
      } finally {
        setLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

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
    setCountryPrices({})
    setOthersPrice({
      price_7d: '',
      price_30d: '',
      activation_fee_7d: '',
      activation_fee_30d: '',
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
    
    // Initialize country prices from existing plan prices
    const prices: Record<string, CountryPrice> = {}
    const othersPrices = {
      price_7d: '',
      price_30d: '',
      activation_fee_7d: '',
      activation_fee_30d: '',
    }
    
    if (plan.plan_prices && plan.plan_prices.length > 0) {
      plan.plan_prices.forEach((price: any) => {
        const country = price.country || 'Nigeria'
        const currency = price.currency || getCurrencyFromCountry(country)
        
        if (country === 'Other' || country === 'Others') {
          if (price.duration_days === 7) {
            othersPrices.price_7d = price.price.toString()
            othersPrices.activation_fee_7d = price.activation_fee?.toString() || ''
          } else if (price.duration_days === 30) {
            othersPrices.price_30d = price.price.toString()
            othersPrices.activation_fee_30d = price.activation_fee?.toString() || ''
          }
        } else {
          if (!prices[country]) {
            prices[country] = {
              country,
              currency,
              price_7d: '',
              price_30d: '',
              activation_fee_7d: '',
              activation_fee_30d: '',
              selected: true,
            }
          }
          
          if (price.duration_days === 7) {
            prices[country].price_7d = price.price.toString()
            prices[country].activation_fee_7d = price.activation_fee?.toString() || ''
          } else if (price.duration_days === 30) {
            prices[country].price_30d = price.price.toString()
            prices[country].activation_fee_30d = price.activation_fee?.toString() || ''
          }
        }
      })
    }
    
    setCountryPrices(prices)
    setOthersPrice(othersPrices)
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
      let planId: string
      
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
        planId = editingPlan.id
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
          .select('id')
          .single()
        const { error, data } = result

        if (error) throw error
        planId = data.id
      }

      // Save pricing
      if (editingPlan) {
        // Delete all existing prices for this plan
        await supabase
          .from('plan_prices')
          .delete()
          .eq('plan_id', planId)
      }

      // Prepare prices to insert
      const pricesToInsert: any[] = []

      // Add selected country prices
      Object.values(countryPrices).forEach((cp) => {
        if (cp.selected) {
          const currency = getCurrencyFromCountry(cp.country)
          
          if (cp.price_7d) {
            pricesToInsert.push({
              plan_id: planId,
              country: cp.country,
              duration_days: 7,
              price: parseFloat(cp.price_7d),
              activation_fee: cp.activation_fee_7d ? parseFloat(cp.activation_fee_7d) : null,
              currency: currency,
            })
          }
          
          if (cp.price_30d) {
            pricesToInsert.push({
              plan_id: planId,
              country: cp.country,
              duration_days: 30,
              price: parseFloat(cp.price_30d),
              activation_fee: cp.activation_fee_30d ? parseFloat(cp.activation_fee_30d) : null,
              currency: currency,
            })
          }
        }
      })

      // Add "Others" prices (USD)
      if (othersPrice.price_7d) {
        pricesToInsert.push({
          plan_id: planId,
          country: 'Others',
          duration_days: 7,
          price: parseFloat(othersPrice.price_7d),
          activation_fee: othersPrice.activation_fee_7d ? parseFloat(othersPrice.activation_fee_7d) : null,
          currency: 'USD',
        })
      }
      
      if (othersPrice.price_30d) {
        pricesToInsert.push({
          plan_id: planId,
          country: 'Others',
          duration_days: 30,
          price: parseFloat(othersPrice.price_30d),
          activation_fee: othersPrice.activation_fee_30d ? parseFloat(othersPrice.activation_fee_30d) : null,
          currency: 'USD',
        })
      }

      // Insert all prices
      if (pricesToInsert.length > 0) {
        const { error: priceError } = await supabase
          .from('plan_prices')
          .insert(pricesToInsert as any)

        if (priceError) throw priceError
      }

      toast.success(editingPlan ? 'Plan updated successfully!' : 'Plan created successfully!')
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

  const toggleCountrySelection = (countryName: string) => {
    const currency = getCurrencyFromCountry(countryName)
    setCountryPrices((prev) => {
      if (prev[countryName]) {
        return {
          ...prev,
          [countryName]: {
            ...prev[countryName],
            selected: !prev[countryName].selected,
          },
        }
      } else {
        return {
          ...prev,
          [countryName]: {
            country: countryName,
            currency,
            price_7d: '',
            price_30d: '',
            activation_fee_7d: '',
            activation_fee_30d: '',
            selected: true,
          },
        }
      }
    })
  }

  const updateCountryPrice = (countryName: string, field: keyof CountryPrice, value: string) => {
    setCountryPrices((prev) => {
      if (!prev[countryName]) {
        const currency = getCurrencyFromCountry(countryName)
        prev[countryName] = {
          country: countryName,
          currency,
          price_7d: '',
          price_30d: '',
          activation_fee_7d: '',
          activation_fee_30d: '',
          selected: true,
        }
      }
      return {
        ...prev,
        [countryName]: {
          ...prev[countryName],
          [field]: value,
        },
      }
    })
  }

  // Get countries that have prices (selected countries)
  const countriesWithPrices = Object.values(countryPrices)
    .filter((cp) => cp.selected)
    .map((cp) => {
      const country = countries.find((c) => c.name === cp.country)
      return {
        ...cp,
        code: country?.code || 'XX',
        name: cp.country,
      }
    })

  // Get available countries to add (countries not already selected)
  const availableCountriesToAdd = countries.filter(
    (country) =>
      !countryPrices[country.name]?.selected &&
      country.name !== 'Other' &&
      country.name !== 'Others'
  )

  const filteredAvailableCountries = availableCountriesToAdd.filter((country) =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  const handleEditPrice = (price: any, planId: string) => {
    setEditingPrice(price)
    const country = price.country || 'Nigeria'
    const currency = price.currency || getCurrencyFromCountry(country)
    setPriceForm({
      plan_id: planId,
      country: country,
      duration_days: price.duration_days,
      price: price.price.toString(),
      activation_fee: price.activation_fee?.toString() || '',
      currency: currency,
    })
    setShowPriceDialog(true)
  }

  const handleCreatePrice = (planId: string) => {
    setEditingPrice(null)
    setPriceForm({
      plan_id: planId,
      country: 'Nigeria',
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
      
      // Automatically determine currency based on country
      const currency = getCurrencyFromCountry(priceForm.country)
      
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
                                      <span>{getCurrencySymbol(price.currency)}</span>
                                      <span>{price.price}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {price.activation_fee
                                      ? (
                                        <div className="flex items-center gap-1">
                                          <span>{getCurrencySymbol(price.currency)}</span>
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
        <DialogContent className="min-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan ? 'Update plan details and pricing' : 'Create a new subscription plan with pricing'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Plan Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="flex-1 overflow-y-auto space-y-4 mt-4">
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
            </TabsContent>

            <TabsContent value="pricing" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Country Pricing</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Manage prices for selected countries. Add countries using the dropdown below.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value=""
                      onValueChange={(countryName) => {
                        if (countryName) {
                          toggleCountrySelection(countryName)
                          setCountrySearch('')
                        }
                      }}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Add a country..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search countries..."
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              className="pl-8 h-8"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {filteredAvailableCountries.length > 0 ? (
                          filteredAvailableCountries.map((country) => {
                            const currency = getCurrencyFromCountry(country.name)
                            const symbol = getCurrencySymbol(currency)
                            return (
                              <SelectItem key={country.code} value={country.name}>
                                {country.name} ({symbol} {currency})
                              </SelectItem>
                            )
                          })
                        ) : (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            {countrySearch ? 'No countries found' : 'All countries added'}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {countriesWithPrices.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b">
                      <div className="grid grid-cols-7 gap-4 font-semibold text-sm">
                        <div>Remove</div>
                        <div>Country</div>
                        <div>1 Week Price</div>
                        <div>1 Week Act. Fee</div>
                        <div>1 Month Price</div>
                        <div>1 Month Act. Fee</div>
                        <div>Currency</div>
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {countriesWithPrices.map((cp) => {
                        const currencySymbol = getCurrencySymbol(cp.currency)
                        
                        return (
                          <div
                            key={cp.code}
                            className="p-4 border-b grid grid-cols-7 gap-4 items-center bg-blue-50"
                          >
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCountrySelection(cp.country)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="font-medium">{cp.country}</div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cp.price_7d}
                                  onChange={(e) => updateCountryPrice(cp.country, 'price_7d', e.target.value)}
                                  placeholder="0.00"
                                  className="pl-6 h-9"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cp.activation_fee_7d}
                                  onChange={(e) => updateCountryPrice(cp.country, 'activation_fee_7d', e.target.value)}
                                  placeholder="0.00"
                                  className="pl-6 h-9"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cp.price_30d}
                                  onChange={(e) => updateCountryPrice(cp.country, 'price_30d', e.target.value)}
                                  placeholder="0.00"
                                  className="pl-6 h-9"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                                  {currencySymbol}
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={cp.activation_fee_30d}
                                  onChange={(e) => updateCountryPrice(cp.country, 'activation_fee_30d', e.target.value)}
                                  placeholder="0.00"
                                  className="pl-6 h-9"
                                />
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">{cp.currency}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-8 text-center text-gray-500">
                    <p>No countries added yet. Use the dropdown above to add countries.</p>
                  </div>
                )}

                {/* Others Row */}
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <div className="mb-3">
                    <Label className="font-semibold text-base">Others (All countries not listed above - USD)</Label>
                    <p className="text-xs text-gray-600 mt-1">
                      This price will apply to all countries that are not in the list above
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm">1 Week Price ($)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={othersPrice.price_7d}
                          onChange={(e) => setOthersPrice({ ...othersPrice, price_7d: e.target.value })}
                          placeholder="0.00"
                          className="pl-6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">1 Week Act. Fee ($)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={othersPrice.activation_fee_7d}
                          onChange={(e) => setOthersPrice({ ...othersPrice, activation_fee_7d: e.target.value })}
                          placeholder="0.00"
                          className="pl-6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">1 Month Price ($)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={othersPrice.price_30d}
                          onChange={(e) => setOthersPrice({ ...othersPrice, price_30d: e.target.value })}
                          placeholder="0.00"
                          className="pl-6"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">1 Month Act. Fee ($)</Label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={othersPrice.activation_fee_30d}
                          onChange={(e) => setOthersPrice({ ...othersPrice, activation_fee_30d: e.target.value })}
                          placeholder="0.00"
                          className="pl-6"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
                  const currency = getCurrencyFromCountry(value)
                  setPriceForm({
                    ...priceForm,
                    country: value,
                    currency: currency,
                  })
                }}
                disabled={loadingCountries}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingCountries ? "Loading countries..." : "Select country"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {countries.map((country) => {
                    const currency = getCurrencyFromCountry(country.name)
                    const symbol = getCurrencySymbol(currency)
                    return (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name} ({symbol} {currency})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Currency will be automatically set based on the selected country
              </p>
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
              <Input
                id="currency"
                value={priceForm.currency}
                disabled={true}
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Currency automatically set based on selected country: {getCurrencySymbol(priceForm.currency)} {priceForm.currency}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {getCurrencySymbol(priceForm.currency)}
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
                    {getCurrencySymbol(priceForm.currency)}
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
