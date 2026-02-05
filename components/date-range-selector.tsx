'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { DATE_RANGES, type DateRangeKey } from '@/lib/types/date-range'

interface DateRangeSelectorProps {
  value?: DateRangeKey
  className?: string
}

export function DateRangeSelector({ value, className }: DateRangeSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentRange = value || (searchParams.get('range') as DateRangeKey) || '30d'

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRange = e.target.value as DateRangeKey
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', newRange)
    router.push(`?${params.toString()}`)
  }

  return (
    <select
      value={currentRange}
      onChange={handleChange}
      className={`block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm ${className || ''}`}
    >
      {Object.entries(DATE_RANGES).map(([key, option]) => (
        <option key={key} value={key}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
