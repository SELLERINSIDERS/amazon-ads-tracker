'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Keyword {
  id: string
  keywordText: string
  matchType: string
  state: string
  bid: number | null
  campaignId: string
  campaignName: string
  adGroupId: string
  adGroupName: string
  impressions: number
  clicks: number
  cost: number
  orders: number
  sales: number
  acos: number | null
  roas: number | null
  ctr: number | null
  cpc: number | null
}

interface FilterOption {
  id: string
  name: string
  campaignId?: string
}

interface KeywordsTableProps {
  keywords: Keyword[]
  campaigns: FilterOption[]
  adGroups: FilterOption[]
  currentCampaignId?: string
  currentAdGroupId?: string
  currentMatchType?: string
}

type SortKey = keyof Keyword
type SortDirection = 'asc' | 'desc'

function formatCurrency(value: number | null): string {
  if (value === null) return '--'
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatPercent(value: number | null): string {
  if (value === null) return '--'
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number): string {
  return value.toLocaleString('en-US')
}

const MATCH_TYPES = ['exact', 'phrase', 'broad']

export function KeywordsTable({
  keywords,
  campaigns,
  adGroups,
  currentCampaignId,
  currentAdGroupId,
  currentMatchType,
}: KeywordsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sortKey, setSortKey] = useState<SortKey>('keywordText')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  const handleFilterChange = (filterKey: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(filterKey, value)
    } else {
      params.delete(filterKey)
    }
    // Reset adGroup when campaign changes
    if (filterKey === 'campaignId') {
      params.delete('adGroupId')
    }
    router.push(`?${params.toString()}`)
  }

  const filteredAdGroups = currentCampaignId
    ? adGroups.filter((ag) => ag.campaignId === currentCampaignId)
    : adGroups

  const sortedKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [keywords, sortKey, sortDirection])

  const SortHeader = ({
    label,
    sortKeyValue,
    className = '',
  }: {
    label: string
    sortKeyValue: SortKey
    className?: string
  }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortKey === sortKeyValue && (
          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign
          </label>
          <select
            value={currentCampaignId || ''}
            onChange={(e) => handleFilterChange('campaignId', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm min-w-[200px]"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ad Group
          </label>
          <select
            value={currentAdGroupId || ''}
            onChange={(e) => handleFilterChange('adGroupId', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm min-w-[200px]"
          >
            <option value="">All Ad Groups</option>
            {filteredAdGroups.map((adGroup) => (
              <option key={adGroup.id} value={adGroup.id}>
                {adGroup.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Match Type
          </label>
          <select
            value={currentMatchType || ''}
            onChange={(e) => handleFilterChange('matchType', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Match Types</option>
            {MATCH_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Keyword" sortKeyValue="keywordText" className="min-w-[150px]" />
                <SortHeader label="Campaign" sortKeyValue="campaignName" />
                <SortHeader label="Match" sortKeyValue="matchType" />
                <SortHeader label="Status" sortKeyValue="state" />
                <SortHeader label="Bid" sortKeyValue="bid" />
                <SortHeader label="Impr." sortKeyValue="impressions" />
                <SortHeader label="Clicks" sortKeyValue="clicks" />
                <SortHeader label="CTR" sortKeyValue="ctr" />
                <SortHeader label="Spend" sortKeyValue="cost" />
                <SortHeader label="Orders" sortKeyValue="orders" />
                <SortHeader label="Sales" sortKeyValue="sales" />
                <SortHeader label="ACoS" sortKeyValue="acos" />
                <SortHeader label="ROAS" sortKeyValue="roas" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedKeywords.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    No keywords found. Try adjusting your filters or sync your data.
                  </td>
                </tr>
              ) : (
                sortedKeywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">
                      {keyword.keywordText}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[150px]">
                      {keyword.campaignName}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {keyword.matchType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          keyword.state === 'enabled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {keyword.state}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(keyword.bid)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(keyword.impressions)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(keyword.clicks)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatPercent(keyword.ctr)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(keyword.cost)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(keyword.orders)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(keyword.sales)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatPercent(keyword.acos)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {keyword.roas?.toFixed(2) ?? '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
