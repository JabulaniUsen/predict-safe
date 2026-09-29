interface SubscriptionLike {
  plan_status: string | null
  expiry_date: string | null
}

/** True when a subscription row is past its expiry date. */
export function isSubscriptionPastDue(
  sub: SubscriptionLike,
  now: Date = new Date()
): boolean {
  return !!sub.expiry_date && new Date(sub.expiry_date) < now
}

/**
 * True when a subscription currently grants access.
 *
 * This is the single source of truth for gating — it treats a row whose
 * expiry date has passed as inactive even if the `plan_status` column hasn't
 * been rewritten yet (no cron job / background worker required). The
 * on-visit deactivation in `deactivate-expired.ts` rewrites the column for
 * display; this check makes access denial immediate.
 */
export function isSubscriptionActive(
  sub: SubscriptionLike,
  now: Date = new Date()
): boolean {
  return sub.plan_status === 'active' && !isSubscriptionPastDue(sub, now)
}
