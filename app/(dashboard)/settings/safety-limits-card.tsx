'use client'

import { useState, useTransition } from 'react'
import { SafetyLimit } from '@prisma/client'
import { updateSafetyLimitsAction } from './actions'

interface SafetyLimitsCardProps {
  initialLimits: SafetyLimit
}

export function SafetyLimitsCard({ initialLimits }: SafetyLimitsCardProps) {
  const [isPending, startTransition] = useTransition()
  const [limits, setLimits] = useState({
    maxBidChangePct: initialLimits.maxBidChangePct,
    maxBudgetChangePct: initialLimits.maxBudgetChangePct,
    maxDailySpend: initialLimits.maxDailySpend ?? '',
    minBidFloor: initialLimits.minBidFloor,
    maxBidCeiling: initialLimits.maxBidCeiling,
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    startTransition(async () => {
      try {
        await updateSafetyLimitsAction({
          maxBidChangePct: limits.maxBidChangePct,
          maxBudgetChangePct: limits.maxBudgetChangePct,
          maxDailySpend: limits.maxDailySpend === '' ? null : Number(limits.maxDailySpend),
          minBidFloor: limits.minBidFloor,
          maxBidCeiling: limits.maxBidCeiling,
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save limits')
      }
    })
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">Safety Limits</h3>
      <p className="mt-2 text-sm text-gray-500">
        Configure bid and budget change limits to prevent accidental overspend.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Bid Change (%)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              step="1"
              value={limits.maxBidChangePct}
              onChange={(e) =>
                setLimits({ ...limits, maxBidChangePct: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum % a bid can change in a single action
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Budget Change (%)
            </label>
            <input
              type="number"
              min="1"
              max="500"
              step="1"
              value={limits.maxBudgetChangePct}
              onChange={(e) =>
                setLimits({ ...limits, maxBudgetChangePct: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum % a budget can change in a single action
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min Bid Floor ($)
            </label>
            <input
              type="number"
              min="0.01"
              max="10"
              step="0.01"
              value={limits.minBidFloor}
              onChange={(e) =>
                setLimits({ ...limits, minBidFloor: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Minimum allowed bid amount
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max Bid Ceiling ($)
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={limits.maxBidCeiling}
              onChange={(e) =>
                setLimits({ ...limits, maxBidCeiling: Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum allowed bid amount
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Max Daily Spend ($)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="No limit"
              value={limits.maxDailySpend}
              onChange={(e) =>
                setLimits({ ...limits, maxDailySpend: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum daily budget across all campaigns (leave empty for no limit)
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {saved && (
          <div className="rounded-md bg-green-50 p-3">
            <p className="text-sm text-green-700">Safety limits saved successfully</p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Limits'}
          </button>
        </div>
      </form>
    </div>
  )
}
