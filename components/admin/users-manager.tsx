'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Search, Plus, Power, PowerOff, Download } from 'lucide-react'
import { Database } from '@/types/database'
import { format } from 'date-fns'

interface UsersManagerProps {
  users: any[]
  plans: any[]
}

export function UsersManager({ users, plans }: UsersManagerProps) {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'subscribers' | 'normal'>('all')
  const [addSubscriptionDialogOpen, setAddSubscriptionDialogOpen] = useState(false)
  const [selectedUserForSubscription, setSelectedUserForSubscription] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [selectedUserForDeactivation, setSelectedUserForDeactivation] = useState<any>(null)
  const [selectedSubscriptionToDeactivate, setSelectedSubscriptionToDeactivate] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState<number>(30)
  const [isProcessing, setIsProcessing] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportFromDate, setExportFromDate] = useState('')
  const [exportToDate, setExportToDate] = useState('')
  const [lastExportAt, setLastExportAt] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set())
  const [exportOnlySelected, setExportOnlySelected] = useState(false)

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const toggleSelectAllVisible = (visibleUsers: any[]) => {
    setSelectedUserIds((prev) => {
      const allSelected = visibleUsers.length > 0 && visibleUsers.every((u) => prev.has(u.id))
      const next = new Set(prev)
      if (allSelected) {
        visibleUsers.forEach((u) => next.delete(u.id))
      } else {
        visibleUsers.forEach((u) => next.add(u.id))
      }
      return next
    })
  }

  const LAST_EXPORT_STORAGE_KEY = 'predictsafe_admin_users_last_export_at'

  // Loaded client-side only (avoids an SSR/hydration mismatch on localStorage)
  useEffect(() => {
    try {
      setLastExportAt(localStorage.getItem(LAST_EXPORT_STORAGE_KEY))
    } catch {
      // localStorage unavailable (private browsing, etc) - just skip the "last exported" hint
    }
  }, [])

  // Separate users into subscribers and normal users
  const { subscribers, normalUsers } = useMemo(() => {
    const subs: any[] = []
    const normal: any[] = []

    users.forEach((user) => {
      const subscriptions = user.user_subscriptions || []
      const hasActiveSubscription = subscriptions.some((sub: any) => sub.plan_status === 'active')

      if (hasActiveSubscription) {
        subs.push(user)
      } else {
        normal.push(user)
      }
    })

    return { subscribers: subs, normalUsers: normal }
  }, [users])

  // Filter users based on search query and active tab
  const filteredUsers = useMemo(() => {
    let usersToFilter = users
    if (activeTab === 'subscribers') usersToFilter = subscribers
    if (activeTab === 'normal') usersToFilter = normalUsers

    if (!searchQuery.trim()) {
      return usersToFilter
    }

    const query = searchQuery.toLowerCase().trim()
    return usersToFilter.filter((user) => {
      const name = (user.full_name || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const country = (user.country || '').toLowerCase()

      return name.includes(query) || email.includes(query) || country.includes(query)
    })
  }, [subscribers, normalUsers, searchQuery, activeTab])

  const handleActivateCorrectScore = async (userId: string, subscriptionId: string) => {
    try {
      const supabase = createClient()
      const startDate = new Date()
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + 7) // Default to 7 days

      const updateData: Database['public']['Tables']['user_subscriptions']['Update'] = {
        activation_fee_paid: true,
        plan_status: 'active',
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
      }

      const { error } = await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', subscriptionId)

      if (error) throw error

      toast.success('Correct Score access activated!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to activate')
    }
  }

  const handleDeactivateSubscription = async () => {
    if (!selectedSubscriptionToDeactivate) {
      toast.error('Please select a subscription to deactivate')
      return
    }

    if (!confirm('Are you sure you want to deactivate this subscription?')) {
      return
    }

    try {
      const supabase = createClient()
      
      // Get subscription details before deactivating
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select('*, plans(name), users(email, full_name)')
        .eq('id', selectedSubscriptionToDeactivate)
        .single()

      const updateData: Database['public']['Tables']['user_subscriptions']['Update'] = {
        plan_status: 'inactive',
      }

      const { error } = await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', selectedSubscriptionToDeactivate)

      if (error) throw error

      // Send rejection email to user
      if (subscriptionData) {
        const subscription = subscriptionData as any
        const planName = subscription.plans?.name || 'Subscription'
        const userEmail = subscription.users?.email
        const userName = subscription.users?.full_name

        try {
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'payment_rejected',
              userId: subscription.user_id,
              planName,
              userEmail,
              userName,
              reason: 'Subscription has been deactivated by admin',
            }),
          })
        } catch (emailError) {
          console.error('Error sending rejection email:', emailError)
          // Don't throw - subscription is already deactivated
        }

        // Create notification for user
        try {
          await supabase
            .from('notifications')
            // @ts-expect-error - Supabase type inference issue
            .insert({
              user_id: subscription.user_id,
              type: 'payment_rejected',
              title: 'Subscription Rejected',
              message: `Your subscription for ${planName} has been rejected and deactivated. Please contact support if you have any questions.`,
              read: false,
            })
        } catch (notifError) {
          console.error('Error creating notification:', notifError)
          // Don't throw - subscription is already deactivated
        }
      }

      toast.success('Subscription deactivated successfully and user has been notified!')
      setDeactivateDialogOpen(false)
      setSelectedUserForDeactivation(null)
      setSelectedSubscriptionToDeactivate('')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate subscription')
    }
  }

  const handleReactivateSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to reactivate this subscription?')) {
      return
    }

    try {
      const supabase = createClient()
      const updateData: Database['public']['Tables']['user_subscriptions']['Update'] = {
        plan_status: 'active',
      }

      const { error } = await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', subscriptionId)

      if (error) throw error

      toast.success('Subscription reactivated successfully!')
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate subscription')
    }
  }

  const handleAddSubscription = async () => {
    if (!selectedUserForSubscription || !selectedPlan) {
      toast.error('Please select a plan')
      return
    }

    setIsProcessing(true)
    try {
      const supabase = createClient()
      const startDate = new Date()
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + selectedDuration)

      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', selectedUserForSubscription.id)
        .eq('plan_id', selectedPlan)
        .maybeSingle()

      if (existingSub) {
        toast.error('User already has a subscription for this plan')
        setIsProcessing(false)
        return
      }

      const insertData: Database['public']['Tables']['user_subscriptions']['Insert'] = {
        user_id: selectedUserForSubscription.id,
        plan_id: selectedPlan,
        plan_status: 'active',
        subscription_fee_paid: true,
        activation_fee_paid: true,
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
      }

      const { error } = await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .insert(insertData)

      if (error) throw error

      toast.success('Subscription added successfully!')
      setAddSubscriptionDialogOpen(false)
      setSelectedUserForSubscription(null)
      setSelectedPlan('')
      setSelectedDuration(30)
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add subscription')
    } finally {
      setIsProcessing(false)
    }
  }

  const getSubscriptionStatusLabel = (user: any) => {
    const subscriptions = user.user_subscriptions || []
    if (subscriptions.length === 0) return 'No subscription'
    return subscriptions
      .map((sub: any) => `${sub.plan?.name || 'Unknown Plan'} (${sub.plan_status})`)
      .join('; ')
  }

  const escapeCsvField = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  // Users to export. Either the manually checked rows, or the currently
  // filtered/searched list further narrowed by an optional joined-date range -
  // lets an admin export just the users who joined since their last export
  // instead of re-exporting everyone every time.
  const exportCandidateUsers = useMemo(() => {
    if (exportOnlySelected) {
      return users.filter((user) => selectedUserIds.has(user.id))
    }

    if (!exportFromDate && !exportToDate) return filteredUsers

    const fromTime = exportFromDate ? new Date(`${exportFromDate}T00:00:00`).getTime() : null
    const toTime = exportToDate ? new Date(`${exportToDate}T23:59:59.999`).getTime() : null

    return filteredUsers.filter((user) => {
      if (!user.created_at) return false
      const created = new Date(user.created_at).getTime()
      if (fromTime !== null && created < fromTime) return false
      if (toTime !== null && created > toTime) return false
      return true
    })
  }, [filteredUsers, exportFromDate, exportToDate, exportOnlySelected, selectedUserIds, users])

  const handleUseLastExportAsFrom = () => {
    if (!lastExportAt) return
    setExportFromDate(format(new Date(lastExportAt), 'yyyy-MM-dd'))
  }

  const handleExportCsv = () => {
    const header = ['Name', 'Email', 'Date', 'Subscription Status']
    const rows = exportCandidateUsers.map((user) => [
      user.full_name || 'N/A',
      user.email || '',
      user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A',
      getSubscriptionStatusLabel(user),
    ])

    const csvContent = [header, ...rows]
      .map((row) => row.map((field) => escapeCsvField(String(field))).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const now = new Date().toISOString()
    try {
      localStorage.setItem(LAST_EXPORT_STORAGE_KEY, now)
    } catch {
      // localStorage unavailable - export still succeeded, just no "last exported" memory
    }
    setLastExportAt(now)
    setExportDialogOpen(false)
    toast.success(`Exported ${exportCandidateUsers.length} user${exportCandidateUsers.length === 1 ? '' : 's'} to CSV`)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Total: {users.length} users | Subscribers: {subscribers.length} | Normal: {normalUsers.length} | Showing: {filteredUsers.length} users
              {selectedUserIds.size > 0 && ` | Selected: ${selectedUserIds.size}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedUserIds.size > 0 && (
              <Button variant="ghost" onClick={() => setSelectedUserIds(new Set())}>
                Clear selection
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setExportFromDate('')
                setExportToDate('')
                setExportOnlySelected(selectedUserIds.size > 0)
                setExportDialogOpen(true)
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'subscribers' | 'normal')}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">
              All Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="subscribers">
              Subscribers ({subscribers.length})
            </TabsTrigger>
            <TabsTrigger value="normal">
              Normal Users ({normalUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id))}
                        onCheckedChange={() => toggleSelectAllVisible(filteredUsers)}
                        aria-label="Select all visible users"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const subscriptions = user.user_subscriptions || []
                      const pendingActivation = subscriptions.find(
                        (s: any) => s.plan_status === 'pending_activation'
                      )

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              aria-label={`Select ${user.full_name || user.email}`}
                            />
                          </TableCell>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.country || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {subscriptions.map((sub: any) => (
                                <Badge
                                  key={sub.id}
                                  variant={
                                    sub.plan_status === 'active'
                                      ? 'default'
                                      : sub.plan_status === 'pending_activation'
                                        ? 'outline'
                                        : sub.plan_status === 'inactive'
                                          ? 'secondary'
                                          : 'secondary'
                                  }
                                >
                                  {sub.plan?.name} ({sub.plan_status})
                                </Badge>
                              ))}
                              {subscriptions.length === 0 && (
                                <span className="text-sm text-muted-foreground">No subscriptions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Dialog open={addSubscriptionDialogOpen} onOpenChange={setAddSubscriptionDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserForSubscription(user)
                                      setSelectedPlan('')
                                      setSelectedDuration(30)
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Subscription</DialogTitle>
                                    <DialogDescription>
                                      Add a new subscription for {user.full_name || user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="plan">Select Plan *</Label>
                                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                        <SelectTrigger id="plan">
                                          <SelectValue placeholder="Choose a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                              {plan.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="duration">Duration *</Label>
                                      <Select
                                        value={selectedDuration.toString()}
                                        onValueChange={(value) => setSelectedDuration(parseInt(value))}
                                      >
                                        <SelectTrigger id="duration">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="7">1 Week (7 days)</SelectItem>
                                          <SelectItem value="30">1 Month (30 days)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={handleAddSubscription}
                                      className="w-full"
                                      disabled={isProcessing || !selectedPlan}
                                    >
                                      {isProcessing ? 'Adding...' : 'Add Subscription'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {subscriptions.length > 0 && (
                                <>
                                  {subscriptions.some((sub: any) => sub.plan_status === 'active') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUserForDeactivation(user)
                                        setSelectedSubscriptionToDeactivate('')
                                        setDeactivateDialogOpen(true)
                                      }}
                                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                      <PowerOff className="h-4 w-4 mr-1" />
                                      Deactivate
                                    </Button>
                                  )}
                                  {subscriptions.map((sub: any) => (
                                    sub.plan_status === 'inactive' && (
                                      <Button
                                        key={`reactivate-${sub.id}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReactivateSubscription(sub.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <Power className="h-4 w-4 mr-1" />
                                        Reactivate {sub.plan?.name}
                                      </Button>
                                    )
                                  ))}
                                </>
                              )}
                              {pendingActivation && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedUser({ user, subscription: pendingActivation })}
                                    >
                                      Activate
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Activate Correct Score Access</DialogTitle>
                                      <DialogDescription>
                                        Activate Correct Score subscription for {user.full_name || user.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-muted-foreground">
                                        This will activate the Correct Score subscription and start the countdown timer.
                                      </p>
                                      <Button
                                        onClick={() =>
                                          handleActivateCorrectScore(user.id, pendingActivation.id)
                                        }
                                        className="w-full"
                                      >
                                        Activate Now
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="subscribers" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id))}
                        onCheckedChange={() => toggleSelectAllVisible(filteredUsers)}
                        aria-label="Select all visible users"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const subscriptions = user.user_subscriptions || []
                      const pendingActivation = subscriptions.find(
                        (s: any) => s.plan_status === 'pending_activation'
                      )

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              aria-label={`Select ${user.full_name || user.email}`}
                            />
                          </TableCell>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.country || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {subscriptions.map((sub: any) => (
                                <Badge
                                  key={sub.id}
                                  variant={
                                    sub.plan_status === 'active'
                                      ? 'default'
                                      : sub.plan_status === 'pending_activation'
                                        ? 'outline'
                                        : sub.plan_status === 'inactive'
                                          ? 'secondary'
                                          : 'secondary'
                                  }
                                >
                                  {sub.plan?.name} ({sub.plan_status})
                                </Badge>
                              ))}
                              {subscriptions.length === 0 && (
                                <span className="text-sm text-muted-foreground">No subscriptions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Dialog open={addSubscriptionDialogOpen} onOpenChange={setAddSubscriptionDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserForSubscription(user)
                                      setSelectedPlan('')
                                      setSelectedDuration(30)
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Subscription</DialogTitle>
                                    <DialogDescription>
                                      Add a new subscription for {user.full_name || user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="plan">Select Plan *</Label>
                                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                        <SelectTrigger id="plan">
                                          <SelectValue placeholder="Choose a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                              {plan.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="duration">Duration *</Label>
                                      <Select
                                        value={selectedDuration.toString()}
                                        onValueChange={(value) => setSelectedDuration(parseInt(value))}
                                      >
                                        <SelectTrigger id="duration">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="7">1 Week (7 days)</SelectItem>
                                          <SelectItem value="30">1 Month (30 days)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={handleAddSubscription}
                                      className="w-full"
                                      disabled={isProcessing || !selectedPlan}
                                    >
                                      {isProcessing ? 'Adding...' : 'Add Subscription'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {subscriptions.length > 0 && (
                                <>
                                  {subscriptions.some((sub: any) => sub.plan_status === 'active') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUserForDeactivation(user)
                                        setSelectedSubscriptionToDeactivate('')
                                        setDeactivateDialogOpen(true)
                                      }}
                                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                      <PowerOff className="h-4 w-4 mr-1" />
                                      Deactivate
                                    </Button>
                                  )}
                                  {subscriptions.map((sub: any) => (
                                    sub.plan_status === 'inactive' && (
                                      <Button
                                        key={`reactivate-${sub.id}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReactivateSubscription(sub.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <Power className="h-4 w-4 mr-1" />
                                        Reactivate {sub.plan?.name}
                                      </Button>
                                    )
                                  ))}
                                </>
                              )}
                              {pendingActivation && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedUser({ user, subscription: pendingActivation })}
                                    >
                                      Activate
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Activate Correct Score Access</DialogTitle>
                                      <DialogDescription>
                                        Activate Correct Score subscription for {user.full_name || user.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-muted-foreground">
                                        This will activate the Correct Score subscription and start the countdown timer.
                                      </p>
                                      <Button
                                        onClick={() =>
                                          handleActivateCorrectScore(user.id, pendingActivation.id)
                                        }
                                        className="w-full"
                                      >
                                        Activate Now
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="normal" className="mt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id))}
                        onCheckedChange={() => toggleSelectAllVisible(filteredUsers)}
                        aria-label="Select all visible users"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const subscriptions = user.user_subscriptions || []
                      const pendingActivation = subscriptions.find(
                        (s: any) => s.plan_status === 'pending_activation'
                      )

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUserIds.has(user.id)}
                              onCheckedChange={() => toggleUserSelection(user.id)}
                              aria-label={`Select ${user.full_name || user.email}`}
                            />
                          </TableCell>
                          <TableCell>{user.full_name || 'N/A'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.country || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {subscriptions.map((sub: any) => (
                                <Badge
                                  key={sub.id}
                                  variant={
                                    sub.plan_status === 'active'
                                      ? 'default'
                                      : sub.plan_status === 'pending_activation'
                                        ? 'outline'
                                        : sub.plan_status === 'inactive'
                                          ? 'secondary'
                                          : 'secondary'
                                  }
                                >
                                  {sub.plan?.name} ({sub.plan_status})
                                </Badge>
                              ))}
                              {subscriptions.length === 0 && (
                                <span className="text-sm text-muted-foreground">No subscriptions</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Dialog open={addSubscriptionDialogOpen} onOpenChange={setAddSubscriptionDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedUserForSubscription(user)
                                      setSelectedPlan('')
                                      setSelectedDuration(30)
                                    }}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Subscription</DialogTitle>
                                    <DialogDescription>
                                      Add a new subscription for {user.full_name || user.email}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="plan">Select Plan *</Label>
                                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                                        <SelectTrigger id="plan">
                                          <SelectValue placeholder="Choose a plan" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {plans.map((plan) => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                              {plan.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="duration">Duration *</Label>
                                      <Select
                                        value={selectedDuration.toString()}
                                        onValueChange={(value) => setSelectedDuration(parseInt(value))}
                                      >
                                        <SelectTrigger id="duration">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="7">1 Week (7 days)</SelectItem>
                                          <SelectItem value="30">1 Month (30 days)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <Button
                                      onClick={handleAddSubscription}
                                      className="w-full"
                                      disabled={isProcessing || !selectedPlan}
                                    >
                                      {isProcessing ? 'Adding...' : 'Add Subscription'}
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {subscriptions.length > 0 && (
                                <>
                                  {subscriptions.some((sub: any) => sub.plan_status === 'active') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUserForDeactivation(user)
                                        setSelectedSubscriptionToDeactivate('')
                                        setDeactivateDialogOpen(true)
                                      }}
                                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    >
                                      <PowerOff className="h-4 w-4 mr-1" />
                                      Deactivate
                                    </Button>
                                  )}
                                  {subscriptions.map((sub: any) => (
                                    sub.plan_status === 'inactive' && (
                                      <Button
                                        key={`reactivate-${sub.id}`}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleReactivateSubscription(sub.id)}
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      >
                                        <Power className="h-4 w-4 mr-1" />
                                        Reactivate {sub.plan?.name}
                                      </Button>
                                    )
                                  ))}
                                </>
                              )}
                              {pendingActivation && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedUser({ user, subscription: pendingActivation })}
                                    >
                                      Activate
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Activate Correct Score Access</DialogTitle>
                                      <DialogDescription>
                                        Activate Correct Score subscription for {user.full_name || user.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <p className="text-sm text-muted-foreground">
                                        This will activate the Correct Score subscription and start the countdown timer.
                                      </p>
                                      <Button
                                        onClick={() =>
                                          handleActivateCorrectScore(user.id, pendingActivation.id)
                                        }
                                        className="w-full"
                                      >
                                        Activate Now
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    }))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Deactivate Subscription Dialog */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Subscription</DialogTitle>
            <DialogDescription>
              Select an active subscription to deactivate for {selectedUserForDeactivation?.full_name || selectedUserForDeactivation?.email || 'this user'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subscription-deactivate">Select Subscription to Deactivate *</Label>
              <Select value={selectedSubscriptionToDeactivate} onValueChange={setSelectedSubscriptionToDeactivate}>
                <SelectTrigger id="subscription-deactivate">
                  <SelectValue placeholder="Choose an active subscription" />
                </SelectTrigger>
                <SelectContent>
                  {(selectedUserForDeactivation?.user_subscriptions || [])
                    .filter((sub: any) => sub.plan_status === 'active')
                    .map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.plan?.name} ({sub.plan_status})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleDeactivateSubscription}
              variant="outline"
              className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              disabled={!selectedSubscriptionToDeactivate}
            >
              <PowerOff className="h-4 w-4 mr-2" />
              Deactivate Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export CSV Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Users to CSV</DialogTitle>
            <DialogDescription>
              Optionally narrow by joined-date range so you only export new users, instead of the full list every time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUserIds.size > 0 && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Checkbox
                  id="export-only-selected"
                  checked={exportOnlySelected}
                  onCheckedChange={(checked) => setExportOnlySelected(checked === true)}
                />
                <Label htmlFor="export-only-selected" className="cursor-pointer">
                  Only export the {selectedUserIds.size} user{selectedUserIds.size === 1 ? '' : 's'} checked in the table
                </Label>
              </div>
            )}
            {!exportOnlySelected && (
              <>
                {lastExportAt && (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800 flex items-center justify-between gap-2 flex-wrap">
                    <span>Last exported: {format(new Date(lastExportAt), 'MMM dd, yyyy, h:mm a')}</span>
                    <Button type="button" size="sm" variant="outline" onClick={handleUseLastExportAsFrom}>
                      Export only new since then
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="export-from">Joined From (optional)</Label>
                    <Input
                      id="export-from"
                      type="date"
                      value={exportFromDate}
                      onChange={(e) => setExportFromDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="export-to">Joined To (optional)</Label>
                    <Input
                      id="export-to"
                      type="date"
                      value={exportToDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                    />
                  </div>
                </div>
                {(exportFromDate || exportToDate) && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setExportFromDate(''); setExportToDate('') }}>
                    Clear date range (export all {filteredUsers.length} shown)
                  </Button>
                )}
              </>
            )}
            <p className="text-sm text-muted-foreground">
              {exportCandidateUsers.length} user{exportCandidateUsers.length === 1 ? '' : 's'} will be exported.
            </p>
            <Button
              onClick={handleExportCsv}
              className="w-full"
              disabled={exportCandidateUsers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Card>
  )
}

