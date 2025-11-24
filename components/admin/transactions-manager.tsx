'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { CheckCircle2, X, Eye, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

type TransactionUpdate = Database['public']['Tables']['transactions']['Update']
type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']

interface TransactionsManagerProps {
  transactions: any[]
  subscriptions: any[]
}

export function TransactionsManager({ transactions: initialTransactions, subscriptions: initialSubscriptions }: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [subscriptions] = useState(initialSubscriptions)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showActivateDialog, setShowActivateDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewingProof, setViewingProof] = useState<string | null>(null)

  const handleConfirmPayment = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Update transaction status to completed
      const updateData: TransactionUpdate = {
        status: 'completed',
        updated_at: new Date().toISOString(),
      }
      const result: any = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', selectedTransaction.id)
      const { error: txError } = result

      if (txError) throw txError

      toast.success('Payment confirmed successfully! You can now activate the subscription.')
      setShowConfirmDialog(false)
      
      // After confirming, show activate dialog
      setTimeout(() => {
        setSelectedTransaction(selectedTransaction)
        setShowActivateDialog(true)
      }, 500)
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateSubscription = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Check if this is an activation fee payment
      const isActivationFee = selectedTransaction.payment_type === 'activation'

      // Log transaction details for debugging
      console.log('Transaction details:', {
        id: selectedTransaction.id,
        subscription_id: selectedTransaction.subscription_id,
        user_id: selectedTransaction.user_id,
        plan_id: selectedTransaction.plan_id,
        payment_type: selectedTransaction.payment_type,
      })

      // Find the subscription related to this transaction by querying the database directly
      // First, try using subscription_id from transaction if available
      let subscription: any = null
      let subscriptionId: string | null = null

      if (selectedTransaction.subscription_id) {
        const subResultById = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('id', selectedTransaction.subscription_id)
          .maybeSingle()
        
        if (subResultById.error) {
          console.error('Error fetching subscription by ID:', subResultById.error)
        } else {
          subscription = subResultById.data
          subscriptionId = subscription?.id || null
          console.log('Found subscription by subscription_id:', subscription)
        }
      }

      // If not found by subscription_id, try by user_id and plan_id (get most recent pending one)
      if (!subscription && selectedTransaction.user_id && selectedTransaction.plan_id) {
        // First try to get the most recent pending subscription
        const subResultPending = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', selectedTransaction.user_id)
          .eq('plan_id', selectedTransaction.plan_id)
          .in('plan_status', ['pending', 'pending_activation'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (subResultPending.error) {
          console.error('Error fetching pending subscription:', subResultPending.error)
        } else if (subResultPending.data) {
          subscription = subResultPending.data
          subscriptionId = subscription?.id || null
          console.log('Found pending subscription:', subscription)
        } else {
          // If no pending subscription, get the most recent one regardless of status
          const subResult = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', selectedTransaction.user_id)
            .eq('plan_id', selectedTransaction.plan_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          
          if (subResult.error) {
            console.error('Error fetching subscription by user_id/plan_id:', subResult.error)
          } else {
            subscription = subResult.data
            subscriptionId = subscription?.id || null
            console.log('Found subscription by user_id/plan_id (most recent):', subscription)
          }
        }
      }

      if (!subscription || !subscriptionId) {
        console.error('Subscription not found. Transaction:', selectedTransaction)
        toast.error('Subscription not found for this transaction. Please check the database.')
        setLoading(false)
        return
      }

      console.log('Updating subscription:', {
        subscriptionId,
        currentStatus: subscription.plan_status,
        userId: subscription.user_id,
        planId: subscription.plan_id,
        isActivationFee,
      })

      if (isActivationFee) {
        // For activation fee payments, update transaction status and subscription
        // Update transaction status to completed
        const txUpdateData: TransactionUpdate = {
          status: 'completed',
          updated_at: new Date().toISOString(),
        }
        const txResult: any = await supabase
          .from('transactions')
          // @ts-expect-error - Supabase type inference issue
          .update(txUpdateData)
          .eq('id', selectedTransaction.id)
        const { error: txError } = txResult
        if (txError) throw txError

        // Get duration from subscription or default to 30 days
        let durationDays = 30
        if (subscription.expiry_date && subscription.start_date) {
          const start = new Date(subscription.start_date)
          const expiry = new Date(subscription.expiry_date)
          durationDays = Math.ceil((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        }

        const startDate = subscription.start_date ? new Date(subscription.start_date) : new Date()
        const expiryDate = subscription.expiry_date ? new Date(subscription.expiry_date) : new Date()
        if (!subscription.expiry_date) {
          expiryDate.setDate(expiryDate.getDate() + durationDays)
        }

        // Update subscription to active with activation fee paid
        const updateData: UserSubscriptionUpdate = {
          activation_fee_paid: true,
          plan_status: 'active',
          start_date: startDate.toISOString(),
          expiry_date: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        }

        const result: any = await supabase
          .from('user_subscriptions')
          // @ts-expect-error - Supabase type inference issue
          .update(updateData)
          .eq('id', subscriptionId)
          .select()
        
        const { data: updatedSub, error: subError } = result

        if (subError) {
          console.error('Error updating subscription:', subError)
          throw subError
        }

        if (!updatedSub || updatedSub.length === 0) {
          throw new Error(`Subscription update failed - no rows updated. Subscription ID: ${subscriptionId}`)
        }

        toast.success('Activation fee approved! User can now access predictions.')
        
        // Notify user that activation fee was approved
        try {
          const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
          const userEmail = (selectedTransaction.users as any)?.email
          const userName = (selectedTransaction.users as any)?.full_name

          // Create notification for user
          await supabase
            .from('notifications')
            // @ts-expect-error - Supabase type inference issue
            .insert({
              user_id: selectedTransaction.user_id,
              type: 'payment_approved',
              title: 'Activation Fee Approved',
              message: `Your activation fee for ${planName} has been approved and your subscription is now active! You can now access all premium features.`,
              read: false,
            })

          // Send email to user
          try {
            await fetch('/api/notifications/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'payment_approved',
                userId: selectedTransaction.user_id,
                planName,
                userEmail,
                userName,
              }),
            })
          } catch (emailError) {
            console.error('Error sending approval email:', emailError)
            // Don't throw - notification is already created
          }
        } catch (notifError) {
          console.error('Error creating approval notification:', notifError)
          // Don't throw - subscription is already activated
        }
      } else {
        // For subscription payments, use existing logic
      // Get duration from transaction metadata or default to 30 days
      const metadata = selectedTransaction.metadata as any
      const durationDays = metadata?.duration_days || 30

      const startDate = new Date()
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + durationDays)

      // Update subscription to active
      const updateData: UserSubscriptionUpdate = {
        subscription_fee_paid: true,
        plan_status: 'active',
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('Update data:', updateData)

      const result: any = await supabase
        .from('user_subscriptions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', subscriptionId)
        .select()
      
      const { data: updatedSub, error: subError } = result

      if (subError) {
        console.error('Error updating subscription:', subError)
        throw subError
      }

      if (!updatedSub || updatedSub.length === 0) {
          throw new Error(`Subscription update failed - no rows updated. Subscription ID: ${subscriptionId}`)
      }

      toast.success('Subscription activated! User is now a premium member.')
      
      // Notify user that payment was approved and subscription is active
      try {
        const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
        const userEmail = (selectedTransaction.users as any)?.email
        const userName = (selectedTransaction.users as any)?.full_name

        // Create notification for user
        await supabase
          .from('notifications')
          // @ts-expect-error - Supabase type inference issue
          .insert({
            user_id: selectedTransaction.user_id,
            type: 'payment_approved',
            title: 'Payment Approved',
            message: `Your payment for ${planName} has been approved and your subscription is now active! You can now access all premium features.`,
            read: false,
          })

        // Send email to user
        try {
          await fetch('/api/notifications/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'payment_approved',
              userId: selectedTransaction.user_id,
              planName,
              userEmail,
              userName,
            }),
          })
        } catch (emailError) {
          console.error('Error sending approval email:', emailError)
          // Don't throw - notification is already created
        }
      } catch (notifError) {
        console.error('Error creating approval notification:', notifError)
        // Don't throw - subscription is already activated
      }
      }

      setShowActivateDialog(false)
      window.location.reload()
    } catch (error: any) {
      console.error('Error activating subscription:', error)
      toast.error(error.message || 'Failed to activate subscription')
    } finally {
      setLoading(false)
    }
  }

  const openConfirmDialog = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowConfirmDialog(true)
  }

  const openActivateDialog = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowActivateDialog(true)
  }

  const openRejectDialog = (transaction: any) => {
    setSelectedTransaction(transaction)
    setRejectionReason('')
    setShowRejectDialog(true)
  }

  const handleRejectPayment = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Update transaction status to failed
      const updateData: TransactionUpdate = {
        status: 'failed',
        updated_at: new Date().toISOString(),
      }
      const result: any = await supabase
        .from('transactions')
        // @ts-expect-error - Supabase type inference issue
        .update(updateData)
        .eq('id', selectedTransaction.id)
      const { error: txError } = result

      if (txError) throw txError

      // Get user email and plan name for notification
      const userEmail = (selectedTransaction.users as any)?.email
      const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
      const userName = (selectedTransaction.users as any)?.full_name

      // Send rejection email
      try {
        const emailResponse = await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'payment_rejected',
            userId: selectedTransaction.user_id,
            planName,
            userEmail,
            userName,
            reason: rejectionReason || undefined,
          }),
        })

        if (!emailResponse.ok) {
          console.error('Failed to send rejection email')
        }
      } catch (emailError) {
        console.error('Error sending rejection email:', emailError)
        // Don't throw - transaction is already rejected
      }

      // Update subscription status if it exists (set to inactive or remove pending status)
      try {
        const subscription = subscriptions.find(
          (sub: any) => sub.user_id === selectedTransaction.user_id && sub.plan_id === selectedTransaction.plan_id
        )
        
        if (subscription) {
          // If it's a subscription payment, set status to inactive
          if (selectedTransaction.payment_type === 'subscription') {
            await supabase
              .from('user_subscriptions')
              // @ts-expect-error - Supabase type inference issue
              .update({
                plan_status: 'inactive',
                subscription_fee_paid: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id)
          } else if (selectedTransaction.payment_type === 'activation') {
            // If it's an activation fee, just mark activation_fee_paid as false
            await supabase
              .from('user_subscriptions')
              // @ts-expect-error - Supabase type inference issue
              .update({
                activation_fee_paid: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscription.id)
          }
        }
      } catch (subError) {
        console.error('Error updating subscription:', subError)
        // Don't throw - transaction is already rejected
      }

      // Create notification for user with rejection reason
      const notificationMessage = rejectionReason 
        ? `Your payment for ${planName} has been rejected. Reason: ${rejectionReason}. Please resubmit your payment with a valid proof.`
        : `Your payment for ${planName} has been rejected. Please resubmit your payment with a valid proof.`
      
      try {
        await supabase
          .from('notifications')
          // @ts-expect-error - Supabase type inference issue
          .insert({
            user_id: selectedTransaction.user_id,
            type: 'payment_rejected',
            title: 'Payment Rejected',
            message: notificationMessage,
            read: false,
          })
      } catch (notifError) {
        console.error('Error creating notification:', notifError)
        // Don't throw - transaction is already rejected
      }

      toast.success('Payment rejected and user has been notified')
      setShowRejectDialog(false)
      setRejectionReason('')
      window.location.reload()
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      toast.error(error.message || 'Failed to reject payment')
    } finally {
      setLoading(false)
    }
  }

  const getPaymentProofUrl = (transaction: any) => {
    const metadata = transaction.metadata as any
    return metadata?.payment_proof_url || null
  }

  // Get pending transactions for subscription payments
  // Filter out transactions where subscription is already active, rejected, or failed
  const pendingTransactions = transactions.filter((tx: any) => {
    // Only show pending transactions, exclude failed/rejected
    if (tx.status !== 'pending' || tx.payment_type !== 'subscription') return false
    
    // Check if there's a subscription that's already active for this transaction
    const subscription = subscriptions.find(
      (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
    )
    
    // Only include if subscription doesn't exist or is not already active
    return !subscription || (subscription.plan_status !== 'active' || !subscription.subscription_fee_paid)
  })
  
  // Get pending activation fee payments
  // Filter out transactions that are rejected/failed
  const pendingActivationFees = transactions.filter((tx: any) => {
    // Only show pending transactions, exclude failed/rejected
    if (tx.status !== 'pending' || tx.payment_type !== 'activation') return false
    
    // Check if activation is already paid
    const subscription = subscriptions.find(
      (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
    )
    
    return !subscription || !subscription.activation_fee_paid
  })
  
  // Get completed transactions that haven't been activated yet
  const completedNotActivated = transactions.filter((tx: any) => {
    if (tx.status !== 'completed' || tx.payment_type !== 'subscription') return false
    const subscription = subscriptions.find(
      (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
    )
    return subscription && subscription.plan_status !== 'active'
  })
  
  const completedTransactions = transactions.filter(
    (tx: any) => tx.status === 'completed' && tx.payment_type === 'subscription'
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pending-subscriptions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending-subscriptions">
            Pending Subscriptions
            {pendingTransactions.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingTransactions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending-activations">
            Pending Activations
            {completedNotActivated.length > 0 && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                {completedNotActivated.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all-transactions">
            All Transactions
          </TabsTrigger>
        </TabsList>

        {/* Pending Subscription Payments Tab */}
        <TabsContent value="pending-subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Subscription Payments</CardTitle>
                  <CardDescription>Review and confirm payment proofs for subscription payments</CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                  {pendingTransactions.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {pendingTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No pending subscription payments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Proof</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransactions.map((tx: any) => {
                      const proofUrl = getPaymentProofUrl(tx)
                      const subscription = subscriptions.find(
                        (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
                      )
                      const isAlreadyActivated = subscription?.plan_status === 'active' && subscription?.subscription_fee_paid === true

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">
                            {(tx.users as any)?.full_name || (tx.users as any)?.email || 'Unknown'}
                          </TableCell>
                          <TableCell>{(tx.plans as any)?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {tx.currency} {tx.amount}
                          </TableCell>
                          <TableCell>{tx.payment_gateway || 'N/A'}</TableCell>
                          <TableCell>
                            {new Date(tx.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {proofUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingProof(proofUrl)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Proof
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">No proof</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                          {!isAlreadyActivated ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openConfirmDialog(tx)}
                                className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Confirm
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejectDialog(tx)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-green-700 border-green-200">
                              Already Activated
                            </Badge>
                          )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Activations Tab - Confirmed Payments Ready to Activate */}
        <TabsContent value="pending-activations">
          {completedNotActivated.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Confirmed Payments - Ready to Activate</CardTitle>
                    <CardDescription>Activate subscriptions for confirmed payments</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-lg px-3 py-1 bg-green-50 text-green-700 border-green-200">
                    {completedNotActivated.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedNotActivated.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {(tx.users as any)?.full_name || (tx.users as any)?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{(tx.plans as any)?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {tx.currency} {tx.amount}
                        </TableCell>
                        <TableCell>{tx.payment_gateway || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openActivateDialog(tx)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Activate Subscription
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">No confirmed payments ready to activate</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Transactions Tab */}
        <TabsContent value="all-transactions">
          {/* Completed Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>All Completed Transactions</CardTitle>
              <CardDescription>All confirmed payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {completedTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No completed transactions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransactions.slice(0, 20).map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {(tx.users as any)?.full_name || (tx.users as any)?.email || 'Unknown'}
                        </TableCell>
                        <TableCell>{(tx.plans as any)?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {tx.currency} {tx.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Payment Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Confirm that payment has been received for this transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User: </span>
                  {(selectedTransaction.users as any)?.full_name || (selectedTransaction.users as any)?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plan: </span>
                  {(selectedTransaction.plans as any)?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {selectedTransaction.currency} {selectedTransaction.amount}
                </p>
                {getPaymentProofUrl(selectedTransaction) && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Payment Proof:</p>
                    <img
                      src={getPaymentProofUrl(selectedTransaction)}
                      alt="Payment proof"
                      className="max-w-full h-auto border rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmPayment} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Subscription Dialog */}
      <Dialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTransaction?.payment_type === 'activation' 
                ? 'Approve Activation Fee & Activate Subscription'
                : 'Activate Subscription'}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction?.payment_type === 'activation'
                ? 'Approve the activation fee payment and grant user access to predictions'
                : 'Make this user a premium member by activating their subscription'}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User: </span>
                  {(selectedTransaction.users as any)?.full_name || (selectedTransaction.users as any)?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plan: </span>
                  {(selectedTransaction.plans as any)?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {selectedTransaction.currency} {selectedTransaction.amount}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Payment Type: </span>
                  {selectedTransaction.payment_type === 'activation' ? 'Activation Fee' : 'Subscription'}
                </p>
                <div className="rounded-lg bg-blue-50 p-3 text-blue-800 text-sm mt-4">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedTransaction.payment_type === 'activation' ? (
                      <>
                        <li>Mark the activation fee payment as completed</li>
                        <li>Set activation_fee_paid to true</li>
                        <li>Set subscription status to active</li>
                        <li>Grant user access to premium predictions</li>
                      </>
                    ) : (
                      <>
                    <li>Mark the subscription as active</li>
                    <li>Set subscription_fee_paid to true</li>
                    <li>Set start and expiry dates</li>
                    <li>Grant user access to premium predictions</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivateDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleActivateSubscription} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Activate Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Payment Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Reject this payment and notify the user. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User: </span>
                  {(selectedTransaction.users as any)?.full_name || (selectedTransaction.users as any)?.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Plan: </span>
                  {(selectedTransaction.plans as any)?.name}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {selectedTransaction.currency} {selectedTransaction.amount}
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="rejection-reason" className="text-sm font-medium">
                  Rejection Reason (Optional)
                </label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter reason for rejection (e.g., Invalid payment proof, Payment not received, etc.)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be included in the email sent to the user.
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-red-800 text-sm">
                <p className="font-medium mb-1">⚠️ Warning:</p>
                <p>This will mark the payment as rejected and send a notification email to the user. The user will need to resubmit their payment.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleRejectPayment} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Proof Viewer */}
      {viewingProof && (
        <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
              <DialogDescription>Proof of payment submitted by user</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <img
                src={viewingProof}
                alt="Payment proof"
                className="w-full h-auto border rounded-lg"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(viewingProof, '_blank')
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

