import { format, addDays, subDays, startOfDay, endOfDay, isToday, isTomorrow, isYesterday } from 'date-fns'

export function getDateRange(type: 'previous' | 'today' | 'tomorrow'): { from: string; to: string } {
  const now = new Date()
  let date: Date

  switch (type) {
    case 'previous':
      date = subDays(now, 1)
      break
    case 'today':
      date = now
      break
    case 'tomorrow':
      date = addDays(now, 1)
      break
    default:
      date = now
  }

  // Return date strings in yyyy-MM-dd format (API requires date only, not datetime)
  const dateStr = format(date, 'yyyy-MM-dd')
  return {
    from: dateStr,
    to: dateStr,
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'EEEE, MMM d, yyyy')
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'HH:mm')
}

export function getDateType(date: Date | string): 'previous' | 'today' | 'tomorrow' {
  const d = typeof date === 'string' ? new Date(date) : date
  
  if (isToday(d)) return 'today'
  if (isTomorrow(d)) return 'tomorrow'
  return 'previous'
}

