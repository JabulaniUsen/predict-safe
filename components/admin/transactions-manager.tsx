'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { CheckCircle2, Eye, ExternalLink, Loader2, XCircle, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [showActivationQuestionDialog, setShowActivationQuestionDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [viewingProof, setViewingProof] = useState<string | null>(null)
  const [loadingProof, setLoadingProof] = useState(false)

  const getPaymentProofPath = (transaction: any) => {
    const metadata = transaction.metadata as any
    return metadata?.payment_proof_path || null
  }

  // Proofs live in the private payment-proofs bucket, so stored URLs can
  // expire or 403. Mint a fresh signed URL via the server before viewing,
  // falling back to the stored URL if signing fails.
  const handleViewProof = async (transaction: any) => {
    const path = getPaymentProofPath(transaction)
    const storedUrl = getPaymentProofUrl(transaction)
    const source = path || storedUrl
    if (!source) return
    setLoadingProof(true)
    try {
      const response = await fetch(`/api/payment-proofs/signed-url?path=${encodeURIComponent(source)}`)
      const result = await response.json()
      setViewingProof(result?.url || storedUrl)
    } catch (error) {
      console.error('Error loading payment proof:', error)
      setViewingProof(storedUrl)
    } finally {
      setLoadingProof(false)
    }
  }

  // Moves a confirmed first-payment subscription into 'pending_activation' instead of
  // straight to 'active', for plans that require a separate activation fee. Used both
  // when the plan already has "Requires Activation Fee" enabled, and when the admin
  // answers "Yes" to the activation-fee question for a plan that doesn't.
  // Writes run through /api/admin/transactions (service role), so this works
  // regardless of the live database's RLS policies on transactions.
  const moveToPendingActivation = async (tx: any) => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move_to_pending_activation', transactionId: tx.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to update subscription')

      const planName = (tx.plans as any)?.name || 'Subscription'
      const userEmail = (tx.users as any)?.email
      const userName = (tx.users as any)?.full_name

      try {
        await fetch('/api/notifications/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_approved',
            userId: tx.user_id,
            planName,
            userEmail,
            userName,
            requiresActivation: true,
          }),
        })
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
      }

      toast.success('Payment confirmed! Subscription moved to Pending Activation, awaiting the activation fee.')
      setShowConfirmDialog(false)
      setShowActivationQuestionDialog(false)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('Error moving subscription to pending activation:', error)
      toast.error(error.message || 'Failed to update subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      // Writes run through /api/admin/transactions (service role) so the
      // confirm works regardless of the live database's RLS policies.
      // The server marks the transaction completed and either moves the
      // subscription to Pending Activation or tells us what to do next.
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', transactionId: selectedTransaction.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to confirm payment')

      if (result.next === 'activate') {
        // Confirming the activation-fee payment no longer activates the subscription
        // directly - it now surfaces in the "Ready to Activate" tab for a final,
        // explicit Activate step (mirrors the first-payment flow).
        toast.success('Activation fee payment confirmed! Go to the Ready to Activate tab to activate the subscription.')
        setShowConfirmDialog(false)
        setTimeout(() => {
          window.location.reload()
        }, 1500)
        return
      }

      if (result.next === 'move_to_pending_activation') {
        // Package already has "Requires Activation Fee" enabled - skip straight to
        // Pending Activation, don't prompt to activate immediately.
        await moveToPendingActivation(selectedTransaction)
        return
      }

      // Plan doesn't have an activation fee pre-configured - ask the admin
      setShowConfirmDialog(false)
      setTimeout(() => {
        setShowActivationQuestionDialog(true)
      }, 300)
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm payment')
    } finally {
      setLoading(false)
    }
  }

  const handleActivationQuestionAnswer = async (activationRequired: boolean) => {
    if (!selectedTransaction) return

    if (activationRequired) {
      await moveToPendingActivation(selectedTransaction)
      return
    }

    setShowActivationQuestionDialog(false)
    toast.success('Payment confirmed successfully! You can now activate the subscription.')
    setTimeout(() => {
      setShowActivateDialog(true)
    }, 300)
  }

  const handleActivateSubscription = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      // All writes run through /api/admin/transactions (service role) so
      // activation works regardless of the live database's RLS policies on
      // transactions / user_subscriptions.
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', transactionId: selectedTransaction.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to activate subscription')

      // Check if this is an activation fee payment
      const isActivationFee = selectedTransaction.payment_type === 'activation'
      const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
      const userEmail = (selectedTransaction.users as any)?.email
      const userName = (selectedTransaction.users as any)?.full_name

      if (isActivationFee) {
        toast.success('Activation fee approved! User can now access predictions.')
      } else {
        toast.success('Subscription activated! User is now a premium member.')
      }

      // Send email to user (the in-app notification is created server-side)
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
      }

      setShowActivateDialog(false)
      // Delay reload to allow toast to be visible
      setTimeout(() => {
      window.location.reload()
      }, 1500)
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
      // Writes run through /api/admin/transactions (service role) so the
      // rejection works regardless of the live database's RLS policies.
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          transactionId: selectedTransaction.id,
          reason: rejectionReason || '',
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to reject payment')

      // Get user email and plan name for notification
      const userEmail = (selectedTransaction.users as any)?.email
      const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
      const userName = (selectedTransaction.users as any)?.full_name

      // Send rejection email (the in-app notification is created server-side)
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

      toast.success('Payment rejected and user has been notified')
      setShowRejectDialog(false)
      setRejectionReason('')
      // Delay reload to allow toast to be visible
      setTimeout(() => {
      window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      toast.error(error.message || 'Failed to reject payment')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteDialog = (transaction: any) => {
    setSelectedTransaction(transaction)
    setDeleteReason('')
    setShowDeleteDialog(true)
  }

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return

    setLoading(true)
    try {
      // Writes run through /api/admin/transactions (service role) so the
      // deletion works regardless of the live database's RLS policies.
      // The server resets the related subscription and notifies the user.
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          transactionId: selectedTransaction.id,
          reason: deleteReason || '',
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to delete transaction')

      // Notify user that this payment record was removed and needs resubmission
      const userEmail = (selectedTransaction.users as any)?.email
      const planName = (selectedTransaction.plans as any)?.name || 'Subscription'
      const userName = (selectedTransaction.users as any)?.full_name

      try {
        await fetch('/api/notifications/send-email', {
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
            reason: deleteReason || undefined,
          }),
        })
      } catch (emailError) {
        console.error('Error sending deletion email:', emailError)
      }

      // Remove from local state immediately
      setTransactions((prev) => prev.filter((tx: any) => tx.id !== selectedTransaction.id))

      toast.success('Transaction deleted')
      setShowDeleteDialog(false)
      setDeleteReason('')
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      toast.error(error.message || 'Failed to delete transaction')
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
  const pendingSubscriptionPayments = transactions.filter((tx: any) => {
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
  // Filter out transactions that are rejected/failed or already approved
  const pendingActivationFees = transactions.filter((tx: any) => {
    // Only show pending transactions, exclude failed/rejected
    if (tx.status !== 'pending' || tx.payment_type !== 'activation') return false
    
    // Check if activation is already paid
    const subscription = subscriptions.find(
      (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
    )
    
    // Include if subscription doesn't exist or activation_fee_paid is false
    return !subscription || !subscription.activation_fee_paid
  })

  // Combine both subscription and activation fee payments for the "Pending Subscription Payments" tab
  const pendingTransactions = [...pendingSubscriptionPayments, ...pendingActivationFees]
  
  // Get completed transactions that haven't been activated yet.
  // Includes both subscription and activation-fee payments, since confirming an
  // activation-fee payment now requires a separate Activate step too. A subscription
  // payment whose plan already moved to 'pending_activation' is excluded here — it's
  // waiting on the activation-fee transaction, not ready to activate yet.
  const completedNotActivated = transactions.filter((tx: any) => {
    if (tx.status !== 'completed') return false
    if (tx.payment_type !== 'subscription' && tx.payment_type !== 'activation') return false
    const subscription = subscriptions.find(
      (sub: any) => sub.user_id === tx.user_id && sub.plan_id === tx.plan_id
    )
    if (!subscription || subscription.plan_status === 'active') return false
    if (tx.payment_type === 'subscription' && subscription.plan_status === 'pending_activation') return false
    return true
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
                  <CardDescription>Review and confirm payment proofs for subscription payments and activation fees</CardDescription>
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
                      // For subscription payments, check if already activated
                      // For activation fees, check if activation_fee_paid is already true
                      const isAlreadyActivated = tx.payment_type === 'subscription' 
                        ? (subscription?.plan_status === 'active' && subscription?.subscription_fee_paid === true)
                        : (subscription?.activation_fee_paid === true)

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">
                            {(tx.users as any)?.full_name || (tx.users as any)?.email || 'Unknown'}
                          </TableCell>
                          <TableCell>{(tx.plans as any)?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{tx.currency} {tx.amount}</span>
                              {tx.payment_type === 'activation' && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  Activation Fee
                                </Badge>
                              )}
                            </div>
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
                                onClick={() => handleViewProof(tx)}
                                disabled={loadingProof}
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
                                className={tx.payment_type === 'activation' 
                                  ? "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                }
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                {tx.payment_type === 'activation' ? 'Approve' : 'Confirm'}
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
                              {tx.payment_type === 'activation' ? 'Approved' : 'Already Activated'}
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
                          <div className="flex items-center gap-2">
                            <span>{tx.currency} {tx.amount}</span>
                            {tx.payment_type === 'activation' && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Activation Fee
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{tx.payment_gateway || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openActivateDialog(tx)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Activate Subscription
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(tx)}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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

      {/* Activation Fee Question Dialog - shown after confirming a first payment for a
          plan that doesn't already have "Requires Activation Fee" enabled */}
      <Dialog open={showActivationQuestionDialog} onOpenChange={setShowActivationQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Does this package require an activation fee?</DialogTitle>
            <DialogDescription>
              This plan doesn&apos;t have &quot;Requires Activation Fee&quot; enabled in its settings. Choose how to proceed with this subscription.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">User: </span>
                {(selectedTransaction.users as any)?.full_name || (selectedTransaction.users as any)?.email}
              </p>
              <p>
                <span className="font-medium">Plan: </span>
                {(selectedTransaction.plans as any)?.name}
              </p>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleActivationQuestionAnswer(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              No - No Activation Fee
            </Button>
            <Button
              onClick={() => handleActivationQuestionAnswer(true)}
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Yes - Activation Fee Required'
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
          {selectedTransaction && (() => {
            // Helper function to get plan type from plan slug
            const getPlanTypeFromSlug = (slug: string): string | null => {
              const mapping: Record<string, string> = {
                'daily-50-odds-combo': 'profit_multiplier',
                'profit-multiplier': 'profit_multiplier',
                'daily-2-odds': 'daily_2_odds',
                'standard': 'standard',
                'free': 'free',
                'correct-score': 'correct_score',
              }
              return mapping[slug] || null
            }

            const planSlug = (selectedTransaction.plans as any)?.slug
            const planType = planSlug ? getPlanTypeFromSlug(planSlug) : null
            const planTypeText = planType ? planType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : null
            const metadata = selectedTransaction.metadata as any
            const durationDays = metadata?.duration_days
            const durationText = durationDays === 7 ? 'Weekly' : durationDays === 30 ? 'Monthly' : durationDays ? `${durationDays} days` : null

            return (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">User: </span>
                  {(selectedTransaction.users as any)?.full_name || (selectedTransaction.users as any)?.email}
                </p>
                <p className="text-sm">
                    <span className="font-medium">Plan Name: </span>
                  {(selectedTransaction.plans as any)?.name}
                </p>
                  {planTypeText && (
                    <p className="text-sm">
                      <span className="font-medium">Plan Type: </span>
                      {planTypeText}
                    </p>
                  )}
                <p className="text-sm">
                  <span className="font-medium">Amount: </span>
                  {selectedTransaction.currency} {selectedTransaction.amount}
                </p>
                  {durationText && (
                    <p className="text-sm">
                      <span className="font-medium">Duration: </span>
                      {durationText}
                    </p>
                  )}
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
            )
          })()}
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

      {/* Delete Transaction Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Permanently remove this transaction so it stops showing as pending activation. This action cannot be undone.
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
                <label htmlFor="delete-reason" className="text-sm font-medium">
                  Reason (Optional)
                </label>
                <Textarea
                  id="delete-reason"
                  placeholder="Enter reason for deleting this transaction (e.g., Duplicate, Invalid payment, etc.)"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be included in the email sent to the user.
                </p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-red-800 text-sm">
                <p className="font-medium mb-1">⚠️ Warning:</p>
                <p>This will permanently delete the transaction record and reset the related subscription. The user will be notified and will need to resubmit their payment.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteTransaction}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Transaction
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

