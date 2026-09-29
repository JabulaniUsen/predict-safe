import { notifySubscriptionEvent } from '@/lib/notifications'

export interface DeactivateExpiredResult {
  checked: number
  deactivated: number
  ids: string[]
}

/**
 * Deactivate every subscription whose expiry date has passed.
 *
 * Deactivation means `plan_status = 'inactive'` so the user immediately loses
 * access everywhere access is gated on `plan_status = 'active'`
 * (predictions pages, winnings, plan cards). A `subscription_expired`
 * notification + email is still sent so the user knows why access stopped.
 *
 * Matches both `active` rows and legacy `expired` rows (from before
 * deactivation was introduced) so old data converges to the same state.
 *
 * Notification failures never fail the deactivation itself.
 */
export async function deactivateExpiredSubscriptions(
  db: any,
  now: Date = new Date()
): Promise<DeactivateExpiredResult> {
  const nowIso = now.toISOString()

  let pastDue: any[] | null = null

  // Preferred path: one query with plan + user details for notifications.
  const { data: joined, error } = await db
    .from('user_subscriptions')
    .select(
      `
        id,
        user_id,
        plan_id,
        expiry_date,
        plan_status,
        plans!inner(name),
        users!inner(email, full_name)
      `
    )
    .in('plan_status', ['active', 'expired'])
    .lt('expiry_date', nowIso)

  if (error) {
    // Fallback: RLS may block the joined user lookup for session-scoped
    // clients. Deactivation must still happen — notifications are best-effort.
    console.error('Joined expired-subscription lookup failed, retrying bare:', error)
    const bare = await db
      .from('user_subscriptions')
      .select('id, user_id')
      .in('plan_status', ['active', 'expired'])
      .lt('expiry_date', nowIso)
    if (bare.error) throw bare.error
    pastDue = (bare.data ?? []).map((row: any) => ({ ...row, plans: null, users: null }))
  } else {
    pastDue = joined
  }

  if (!pastDue || pastDue.length === 0) {
    return { checked: 0, deactivated: 0, ids: [] }
  }

  let deactivated = 0
  const ids: string[] = []

  for (const row of pastDue) {
    const sub = row as any

    const { error: updateError } = await db
      .from('user_subscriptions')
      .update({ plan_status: 'inactive' })
      .eq('id', sub.id)

    if (updateError) {
      console.error(`Failed to deactivate expired subscription ${sub.id}:`, updateError)
      continue
    }

    ids.push(sub.id)
    deactivated++

    try {
      await notifySubscriptionEvent(
        sub.user_id,
        sub.plans?.name || 'Unknown Plan',
        'expired',
        sub.users?.email,
        sub.users?.full_name || undefined,
        db
      )
    } catch (notifyError) {
      console.error(`Failed to notify expiry for subscription ${sub.id}:`, notifyError)
    }
  }

  return { checked: pastDue.length, deactivated, ids }
}
