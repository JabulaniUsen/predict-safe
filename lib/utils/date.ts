import { format, addDays, subDays, isToday, isTomorrow } from 'date-fns'

/**
 * A calendar day in `YYYY-MM-DD` form.
 *
 * This is the only representation of "which day" that crosses a boundary in
 * this app - between the UI and the database, and between the app and the
 * football provider. Turning a day into a `Date` and back again is what used
 * to shift dates around, so the string is the canonical form and `Date` is
 * only ever a transient detail.
 */
export type DateKey = string

export type DateFilterType = 'previous' | 'today' | 'tomorrow' | 'custom'

/**
 * Formats a `Date` as a date key using its *local* calendar components.
 *
 * `toISOString().split('T')[0]` looks like it does this but doesn't: it
 * converts to UTC first, so for anyone west of Greenwich an evening date comes
 * back as the following day (and for anyone east, an early-morning date comes
 * back as the previous one).
 */
export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd')
}

/**
 * Parses a date key into a `Date` at local midnight.
 *
 * `new Date('2025-08-23')` is specified to parse as *UTC* midnight, so in any
 * timezone behind UTC it lands on 22 August local time. Reformatting that then
 * yields the wrong day. This builds the date from its parts instead, so the day
 * you put in is the day you get out.
 */
export function parseDateKey(key: DateKey): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return new Date(key)
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** The calendar day a timestamp falls on, in UTC. */
export function toUtcDateKey(value: Date | string): DateKey {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Today's date key, in the viewer's local timezone. */
export function todayKey(): DateKey {
  return toDateKey(new Date())
}

/**
 * Resolves a date filter selection to the single calendar day it refers to.
 *
 * `from` and `to` are always the same day - the pair is kept because callers
 * pass them straight through to the provider's `from`/`to` fixture params.
 */
export function getDateRange(
  type: DateFilterType,
  customDate?: string,
  daysBack?: number
): { from: DateKey; to: DateKey } {
  const now = new Date()
  let date: Date

  switch (type) {
    case 'previous':
      date = subDays(now, daysBack !== undefined ? daysBack : 1)
      break
    case 'tomorrow':
      date = addDays(now, 1)
      break
    case 'custom':
      // Round-tripping through `parseDateKey` (not `new Date`) is what keeps a
      // date picked in, say, New York from resolving to the previous day.
      date = customDate ? parseDateKey(customDate) : now
      break
    case 'today':
    default:
      date = now
  }

  const dateStr = toDateKey(date)
  return { from: dateStr, to: dateStr }
}

export function formatDate(date: Date | string): string {
  // Plain "YYYY-MM-DD" strings (e.g. from a Postgres `date` column, like
  // predictions.prediction_date) are parsed by `new Date()` as UTC midnight.
  // Formatting that in any timezone behind UTC shifts the displayed day back
  // by one, so parse the parts directly.
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? parseDateKey(date)
      : typeof date === 'string'
        ? new Date(date)
        : date
  const day = d.getDate()
  const suffix =
    day === 1 || day === 21 || day === 31
      ? 'st'
      : day === 2 || day === 22
        ? 'nd'
        : day === 3 || day === 23
          ? 'rd'
          : 'th'
  return format(d, `EEEE, d'${suffix}' MMMM, yyyy`)
}

/** Short form for compact UI - "Sat 23 Aug". */
export function formatDateShort(date: Date | string): string {
  const d =
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? parseDateKey(date)
      : typeof date === 'string'
        ? new Date(date)
        : date
  return format(d, 'EEE d MMM')
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return format(d, 'HH:mm')
}

export function getDateType(date: Date | string): 'previous' | 'today' | 'tomorrow' {
  const d = typeof date === 'string' ? parseDateKey(date) : date

  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  return 'previous'
}
