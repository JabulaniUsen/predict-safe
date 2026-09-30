import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateKey } from '@/lib/utils/date'

/**
 * Whole-day publish gate for prediction content.
 *
 * A date's predictions (free, correct-score, VIP, dashboard) must only be
 * served once the admin has published that date. A missing row means
 * unpublished — dates nobody has touched yet have no row.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = SupabaseClient<any, any, any>

/** True when `date` has been published by the admin. Missing row = false. */
export async function isDatePublished(
  supabase: AnyClient,
  date: DateKey
): Promise<boolean> {
  if (!date) return false
  const { data, error } = await supabase
    .from('daily_publications')
    .select('is_published')
    .eq('prediction_date', date)
    .maybeSingle()
  if (error || !data) return false
  return (data as { is_published: boolean }).is_published === true
}

/** Admin-only: publish or unpublish a date. Upserts the gate row. */
export async function setDatePublished(
  supabase: AnyClient,
  date: DateKey,
  published: boolean
): Promise<void> {
  const patch = published
    ? {
        prediction_date: date,
        is_published: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : {
        prediction_date: date,
        is_published: false,
        published_at: null,
        updated_at: new Date().toISOString(),
      }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('daily_publications')
    .upsert(patch, { onConflict: 'prediction_date' })
  if (error) throw error
}
