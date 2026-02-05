export type DateRangeKey = 'today' | '7d' | '30d' | '90d' | 'lifetime'

export interface DateRangeOption {
  label: string
  days: number | null
}

export const DATE_RANGES: Record<DateRangeKey, DateRangeOption> = {
  today: { label: 'Today', days: 1 },
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  lifetime: { label: 'Lifetime', days: null },
}

export function getDateRangeFilter(range: DateRangeKey): { start: string; end: string } | null {
  const option = DATE_RANGES[range]
  if (!option.days) return null // lifetime

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - option.days + 1)

  return {
    start: formatDate(start),
    end: formatDate(end),
  }
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function parseDate(dateStr: string): Date {
  const year = parseInt(dateStr.slice(0, 4))
  const month = parseInt(dateStr.slice(4, 6)) - 1
  const day = parseInt(dateStr.slice(6, 8))
  return new Date(year, month, day)
}
