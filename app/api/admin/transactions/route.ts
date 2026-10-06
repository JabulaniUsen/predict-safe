import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Database } from '@/types/database'

type UserProfile = Pick<Database['public']['Tables']['users']['Row'], 'is_admin'> | null

type Action = 'confirm' | 'move_to_pending_activation' | 'activate' | 'reject' | 'delete'

interface TxRow {
  id: string
  user_id: string
  plan_id: string | null
  subscription_id: string | null
  payment_type: string
  status: string
  metadata: unknown
  plans: { name: string; requires_activation: boolean | null } | null
}

interface SubRow {
  id: string
  plan_status: string
  start_date: string | null
  expiry_date: string | null
}

/**
 * Admin writes on transactions + user_subscriptions.
 *
 * These used to run straight from the browser with the admin's own JWT, so
 * they only worked when the live database happened to have permissive RLS
 * on `transactions` (the repo migrations intentionally ship no policies for
 * it). When the policies are missing/stricter, Confirm/Reject/Activate all
 * fail and the pending indicator never moves. Running the writes here with
 * the service-role client bypasses RLS; when no service key is configured we
 * fall back to the admin's JWT (previous behaviour).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userProfile } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
    if (!(userProfile as UserProfile)?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await request.json()) as { action?: Action; transactionId?: string; reason?: string }
    const { action, transactionId, reason } = body
    if (!action || !transactionId) {
      return NextResponse.json({ error: 'Missing action or transactionId' }, { status: 400 })
    }

    const service = createServiceClient()
    // The two clients have different TS types; both are Database-typed
    // Supabase clients, so a single dynamic handle keeps this readable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = service ?? supabase

    const txResult = await db
      .from('transactions')
      .select('*, plans(name, requires_activation)')
      .eq('id', transactionId)
      .single()
    if (txResult.error || !txResult.data) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
    }
    const tx = txResult.data as TxRow

    switch (action) {
      case 'confirm':
        return await handleConfirm(db, tx)
      case 'move_to_pending_activation':
        return await handleMoveToPendingActivation(db, tx)
      case 'activate':
        return await handleActivate(db, tx)
      case 'reject':
        return await handleReject(db, tx, reason || '')
      case 'delete':
        return await handleDelete(db, tx, reason || '')
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in admin transactions action:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function dbError(context: string, err: unknown): NextResponse {
  console.error(context, err)
  const message = err instanceof Error ? err.message : typeof err === 'object' && err !== null && 'message' in err
    ? String((err as { message: unknown }).message)
    : 'Database error'
  return NextResponse.json({ error: message }, { status: 500 })
}

async function findSubscriptionByTx(db: unknown, tx: TxRow): Promise<SubRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  if (tx.subscription_id) {
    const byId = await client.from('user_subscriptions').select('*').eq('id', tx.subscription_id).maybeSingle()
    if (!byId.error && byId.data) return byId.data as SubRow
  }
  if (tx.user_id && tx.plan_id) {
    const byPair = await client
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', tx.user_id)
      .eq('plan_id', tx.plan_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!byPair.error && byPair.data) return byPair.data as SubRow
  }
  return null
}

async function findLatestSubscription(db: unknown, userId: string, planId: string | null): Promise<SubRow | null> {
  if (!planId) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  const res = await client
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!res.error && res.data) return res.data as SubRow
  return null
}

async function handleConfirm(db: unknown, tx: TxRow): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  if (tx.status !== 'pending') {
    return NextResponse.json({ error: 'Transaction is no longer pending.' }, { status: 409 })
  }

  const txUpdate = await client
    .from('transactions')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', tx.id)
  if (txUpdate.error) return dbError('Error completing transaction:', txUpdate.error)

  if (tx.payment_type === 'activation') {
    // Confirming the activation-fee payment surfaces in the
    // "Ready to Activate" tab for a final, explicit Activate step.
    return NextResponse.json({ ok: true, next: 'activate', kind: 'activation' })
  }

  if (tx.plans?.requires_activation) {
    // Package already has "Requires Activation Fee" enabled — the client
    // follows up with the move_to_pending_activation action.
    return NextResponse.json({ ok: true, next: 'move_to_pending_activation' })
  }

  // Plan has no activation fee pre-configured — the client asks the admin.
  return NextResponse.json({ ok: true, next: 'ask_activation' })
}

async function handleMoveToPendingActivation(db: unknown, tx: TxRow): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  const subscription = await findSubscriptionByTx(db, tx)
  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found for this transaction.' }, { status: 404 })
  }

  const subUpdate = await client
    .from('user_subscriptions')
    .update({
      plan_status: 'pending_activation',
      subscription_fee_paid: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
  if (subUpdate.error) return dbError('Error moving subscription to pending activation:', subUpdate.error)

  const planName = tx.plans?.name || 'Subscription'
  try {
    await client.from('notifications').insert({
      user_id: tx.user_id,
      type: 'payment_approved',
      title: 'Payment Confirmed - Activation Fee Required',
      message: `Your payment for ${planName} has been confirmed. Please log in to your dashboard and pay the required activation fee to activate your subscription.`,
      read: false,
    })
  } catch (notifError) {
    console.error('Error creating notification:', notifError)
  }

  return NextResponse.json({ ok: true, next: 'pending_activation' })
}

function metadataDuration(metadata: unknown): number | null {
  const days = (metadata as { duration_days?: unknown } | null)?.duration_days
  return typeof days === 'number' && days > 0 ? days : null
}

async function handleActivate(db: unknown, tx: TxRow): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any

  let subscription: SubRow | null = null
  if (tx.subscription_id) {
    const byId = await client.from('user_subscriptions').select('*').eq('id', tx.subscription_id).maybeSingle()
    if (!byId.error && byId.data) subscription = byId.data as SubRow
  }
  if (!subscription && tx.user_id && tx.plan_id) {
    const pending = await client
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', tx.user_id)
      .eq('plan_id', tx.plan_id)
      .in('plan_status', ['pending', 'pending_activation'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!pending.error && pending.data) {
      subscription = pending.data as SubRow
    } else {
      subscription = await findLatestSubscription(db, tx.user_id, tx.plan_id)
    }
  }

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found for this transaction. Please check the database.' }, { status: 404 })
  }

  const planName = tx.plans?.name || 'Subscription'

  if (tx.payment_type === 'activation') {
    const txUpdate = await client
      .from('transactions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', tx.id)
    if (txUpdate.error) return dbError('Error completing activation transaction:', txUpdate.error)

    // The user chose Weekly or Monthly in the activation modal — without the
    // metadata the dates below are usually still null and this would always
    // grant 30 days, even for a weekly activation payment.
    let durationDays = metadataDuration(tx.metadata) ?? 30
    if (metadataDuration(tx.metadata) === null && subscription.expiry_date && subscription.start_date) {
      const start = new Date(subscription.start_date)
      const expiry = new Date(subscription.expiry_date)
      durationDays = Math.ceil((expiry.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    }

    const startDate = subscription.start_date ? new Date(subscription.start_date) : new Date()
    const expiryDate = subscription.expiry_date ? new Date(subscription.expiry_date) : new Date()
    if (!subscription.expiry_date) {
      expiryDate.setDate(expiryDate.getDate() + durationDays)
    }

    const subUpdate = await client
      .from('user_subscriptions')
      .update({
        activation_fee_paid: true,
        plan_status: 'active',
        start_date: startDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
      .select()
    if (subUpdate.error) return dbError('Error updating subscription:', subUpdate.error)
    if (!subUpdate.data || subUpdate.data.length === 0) {
      return NextResponse.json({ error: `Subscription update failed - no rows updated. Subscription ID: ${subscription.id}` }, { status: 500 })
    }

    try {
      await client.from('notifications').insert({
        user_id: tx.user_id,
        type: 'payment_approved',
        title: 'Activation Fee Approved',
        message: `Your activation fee for ${planName} has been approved and your subscription is now active! You can now access all premium features.`,
        read: false,
      })
    } catch (notifError) {
      console.error('Error creating approval notification:', notifError)
    }

    return NextResponse.json({ ok: true, next: 'done', kind: 'activation' })
  }

  // Subscription (first) payment activation
  const durationDays = metadataDuration(tx.metadata) ?? 30
  const startDate = new Date()
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + durationDays)

  const subUpdate = await client
    .from('user_subscriptions')
    .update({
      subscription_fee_paid: true,
      plan_status: 'active',
      start_date: startDate.toISOString(),
      expiry_date: expiryDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)
    .select()
  if (subUpdate.error) return dbError('Error updating subscription:', subUpdate.error)
  if (!subUpdate.data || subUpdate.data.length === 0) {
    return NextResponse.json({ error: `Subscription update failed - no rows updated. Subscription ID: ${subscription.id}` }, { status: 500 })
  }

  try {
    await client.from('notifications').insert({
      user_id: tx.user_id,
      type: 'payment_approved',
      title: 'Payment Approved',
      message: `Your payment for ${planName} has been approved and your subscription is now active! You can now access all premium features.`,
      read: false,
    })
  } catch (notifError) {
    console.error('Error creating approval notification:', notifError)
  }

  return NextResponse.json({ ok: true, next: 'done', kind: 'subscription' })
}

async function handleReject(db: unknown, tx: TxRow, reason: string): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  const txUpdate = await client
    .from('transactions')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', tx.id)
  if (txUpdate.error) return dbError('Error rejecting transaction:', txUpdate.error)

  const planName = tx.plans?.name || 'Subscription'
  try {
    const subscription = await findLatestSubscription(db, tx.user_id, tx.plan_id)
    if (subscription) {
      if (tx.payment_type === 'subscription') {
        await client
          .from('user_subscriptions')
          .update({ plan_status: 'inactive', subscription_fee_paid: false, updated_at: new Date().toISOString() })
          .eq('id', subscription.id)
      } else if (tx.payment_type === 'activation') {
        await client
          .from('user_subscriptions')
          .update({ activation_fee_paid: false, updated_at: new Date().toISOString() })
          .eq('id', subscription.id)
      }
    }
  } catch (subError) {
    console.error('Error updating subscription:', subError)
  }

  const notificationMessage = reason
    ? `Your payment for ${planName} has been rejected. Reason: ${reason}. Please resubmit your payment with a valid proof.`
    : `Your payment for ${planName} has been rejected. Please resubmit your payment with a valid proof.`
  try {
    await client.from('notifications').insert({
      user_id: tx.user_id,
      type: 'payment_rejected',
      title: 'Payment Rejected',
      message: notificationMessage,
      read: false,
    })
  } catch (notifError) {
    console.error('Error creating notification:', notifError)
  }

  return NextResponse.json({ ok: true, next: 'done' })
}

async function handleDelete(db: unknown, tx: TxRow, reason: string): Promise<NextResponse> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db as any
  const planName = tx.plans?.name || 'Subscription'

  try {
    const subscription = await findLatestSubscription(db, tx.user_id, tx.plan_id)
    if (subscription && subscription.plan_status !== 'active') {
      if (tx.payment_type === 'subscription') {
        await client
          .from('user_subscriptions')
          .update({ plan_status: 'inactive', subscription_fee_paid: false, updated_at: new Date().toISOString() })
          .eq('id', subscription.id)
      } else if (tx.payment_type === 'activation') {
        await client
          .from('user_subscriptions')
          .update({ activation_fee_paid: false, updated_at: new Date().toISOString() })
          .eq('id', subscription.id)
      }
    }
  } catch (subError) {
    console.error('Error resetting subscription:', subError)
  }

  const txDelete = await client.from('transactions').delete().eq('id', tx.id)
  if (txDelete.error) return dbError('Error deleting transaction:', txDelete.error)

  try {
    await client.from('notifications').insert({
      user_id: tx.user_id,
      type: 'payment_rejected',
      title: 'Payment Removed',
      message: reason
        ? `Your payment for ${planName} has been removed. Reason: ${reason}. Please resubmit your payment with a valid proof.`
        : `Your payment for ${planName} has been removed. Please resubmit your payment with a valid proof.`,
      read: false,
    })
  } catch (notifError) {
    console.error('Error creating notification:', notifError)
  }

  return NextResponse.json({ ok: true, next: 'done' })
}
