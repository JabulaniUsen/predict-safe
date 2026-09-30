import type { SupabaseClient } from '@supabase/supabase-js'
import type { DateKey } from '@/lib/utils/date'
import { toUtcDateKey } from '@/lib/utils/date'
import { isDatePublished } from '@/lib/daily-publications'

/**
 * The one place predictions are looked up by date.
 *
 * Previously each section re-derived a prediction's date from `kickoff_time` -
 * some in UTC, some in the viewer's local timezone, one against a completely
 * different table - so the same calendar date returned a different set of games
 * depending on which part of the site you asked. Everything now filters on the
 * stored `prediction_date`, which is written once when the prediction is
 * created and never recomputed.
 *
 * `plan_type` values map to plans as follows:
 *   profit_multiplier -> Daily 50 Odds Combo
 *   daily_2_odds      -> Daily 2 Odds
 *   standard          -> Standard VIP
 *   correct_score     -> Correct Score
 *   free              -> Free picks
 */
export type PlanType =
  | 'profit_multiplier'
  | 'daily_2_odds'
  | 'standard'
  | 'free'
  | 'correct_score'

interface PredictionsQueryOptions {
  /** The day the predictions were provided for. */
  date: DateKey
  /** Restrict to a single plan. Omit for every plan on that date. */
  planType?: PlanType
  /** Cap the number of rows returned. Omit for all of them. */
  limit?: number
}

/**
 * Builds the canonical "predictions provided on this date" query.
 *
 * Callers add their own presentation concerns (preview limits, locked-plan
 * filters) on top of the returned builder, but the date filter itself is
 * always this one.
 */
export function predictionsForDate(
  // The generated Database types make the concrete client type unwieldy to
  // thread through every caller; the query shape is what matters here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { date, planType, limit }: PredictionsQueryOptions
) {
  let query = supabase
    .from('predictions')
    .select('*')
    .eq('prediction_date', date)
    .order('kickoff_time', { ascending: true })

  if (planType) {
    query = query.eq('plan_type', planType)
  }

  if (limit !== undefined) {
    query = query.limit(limit)
  }

  return query
}

export interface PublishedDateResult<T> {
  data: T[] | null
  error: unknown
  /** True when the date hasn't been published — nothing was fetched. */
  unpublished: boolean
}

/**
 * Gated version of `predictionsForDate` for every PUBLIC surface.
 *
 * Returns `{ unpublished: true }` without touching the predictions table when
 * the admin hasn't published the date yet, so a new day's rows can never leak
 * to visitors in timezones ahead of the admin before review.
 *
 * Admin tooling and server jobs must keep using `predictionsForDate`
 * directly — they need to see unpublished rows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function predictionsForPublishedDate<T = any>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  { date, planType, limit }: PredictionsQueryOptions
): Promise<PublishedDateResult<T>> {
  const published = await isDatePublished(supabase, date)
  if (!published) {
    return { data: [], error: null, unpublished: true }
  }
  const { data, error } = await predictionsForDate(supabase, { date, planType, limit })
  return { data: (data ?? []) as T[], error, unpublished: false }
}

/**
 * The date a prediction belongs to, tolerating rows written before
 * `prediction_date` existed (migration 028 backfills these, but a row created
 * by an older client mid-deploy could still arrive without one).
 */
export function predictionDateOf(prediction: {
  prediction_date?: string | null
  kickoff_time?: string | null
}): DateKey {
  if (prediction.prediction_date) {
    // Postgres `date` columns come back as plain YYYY-MM-DD.
    return prediction.prediction_date.slice(0, 10)
  }
  return prediction.kickoff_time ? toUtcDateKey(prediction.kickoff_time) : ''
}
