'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Database } from '@/types/database'
import { CheckCircle2, X, Eye, ExternalLink, Loader2 } from 'lucide-react'

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

      // Log transaction details for debugging
      console.log('Transaction details:', {
        id: selectedTransaction.id,
        subscription_id: selectedTransaction.subscription_id,
        user_id: selectedTransaction.user_id,
        plan_id: selectedTransaction.plan_id,
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
      })

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
        console.error('Subscription ID used:', subscriptionId)
        console.error('Update data:', updateData)
        throw subError
      }

      console.log('Update result:', { updatedSub, rowCount: updatedSub?.length })

      if (!updatedSub || updatedSub.length === 0) {
        console.error('No rows updated. Checking if subscription exists...')
        // Double-check if subscription exists
        const verifyResult = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('id', subscriptionId)
          .maybeSingle()
        
        console.error('Verification query result:', verifyResult)
        throw new Error(`Subscription update failed - no rows updated. Subscription ID: ${subscriptionId}, Subscription exists: ${!!verifyResult.data}`)
      }

      toast.success('Subscription activated! User is now a premium member.')
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

  const getPaymentProofUrl = (transaction: any) => {
    const metadata = transaction.metadata as any
    return metadata?.payment_proof_url || null
  }

  // Get pending transactions for subscription payments
  const pendingTransactions = transactions.filter(
    (tx: any) => tx.status === 'pending' && tx.payment_type === 'subscription'
  )
  
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
      {/* Pending Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Payments</CardTitle>
              <CardDescription>Review and confirm payment proofs</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {pendingTransactions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No pending payments</p>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openConfirmDialog(tx)}
                            >
                              Confirm Payment
                            </Button>
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

      {/* Completed Payments - Awaiting Activation */}
      {completedNotActivated.length > 0 && (
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
      )}

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
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Make this user a premium member by activating their subscription
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
                <div className="rounded-lg bg-blue-50 p-3 text-blue-800 text-sm mt-4">
                  <p className="font-medium mb-1">This will:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mark the subscription as active</li>
                    <li>Set subscription_fee_paid to true</li>
                    <li>Set start and expiry dates</li>
                    <li>Grant user access to premium predictions</li>
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

