'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface AuditFiltersProps {
  currentActionType?: string
  currentEntityType?: string
  currentActorType?: string
}

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'bid_change', label: 'Bid Change' },
  { value: 'budget_change', label: 'Budget Change' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'keyword_add', label: 'Keyword Add' },
  { value: 'keyword_remove', label: 'Keyword Remove' },
  { value: 'campaign_create', label: 'Campaign Create' },
  { value: 'sync_triggered', label: 'Sync Triggered' },
]

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'ad_group', label: 'Ad Group' },
  { value: 'profile', label: 'Profile' },
]

const ACTOR_TYPES = [
  { value: '', label: 'All Actors' },
  { value: 'user', label: 'User' },
  { value: 'agent', label: 'AI Agent' },
  { value: 'rule', label: 'Automation Rule' },
  { value: 'system', label: 'System' },
]

export function AuditFilters({
  currentActionType,
  currentEntityType,
  currentActorType,
}: AuditFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (filterKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(filterKey, value)
    } else {
      params.delete(filterKey)
    }
    // Reset to page 1 when filters change
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Action Type
          </label>
          <select
            value={currentActionType || ''}
            onChange={(e) => handleFilterChange('actionType', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm min-w-[150px]"
          >
            {ACTION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Entity Type
          </label>
          <select
            value={currentEntityType || ''}
            onChange={(e) => handleFilterChange('entityType', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm min-w-[150px]"
          >
            {ENTITY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actor
          </label>
          <select
            value={currentActorType || ''}
            onChange={(e) => handleFilterChange('actorType', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm min-w-[150px]"
          >
            {ACTOR_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
