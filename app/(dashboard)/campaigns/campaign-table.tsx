'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Campaign {
  id: string
  name: string
  type: string
  state: string
  budget: number | null
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

interface CampaignTableProps {
  campaigns: Campaign[]
  currentType?: string
  currentStatus?: string
}

type SortKey = keyof Campaign
type SortDirection = 'asc' | 'desc'

function formatCurrency(value: number): string {
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

export function CampaignTable({
  campaigns,
  currentType,
  currentStatus,
}: CampaignTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sortKey, setSortKey] = useState<SortKey>('name')
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
    router.push(`?${params.toString()}`)
  }

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
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
  }, [campaigns, sortKey, sortDirection])

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
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
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
      <div className="flex space-x-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={currentType || ''}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            <option value="SP">Sponsored Products</option>
            <option value="SB">Sponsored Brands</option>
            <option value="SD">Sponsored Display</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={currentStatus || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Name" sortKeyValue="name" className="min-w-[200px]" />
                <SortHeader label="Type" sortKeyValue="type" />
                <SortHeader label="Status" sortKeyValue="state" />
                <SortHeader label="Budget" sortKeyValue="budget" />
                <SortHeader label="Impr." sortKeyValue="impressions" />
                <SortHeader label="Clicks" sortKeyValue="clicks" />
                <SortHeader label="CTR" sortKeyValue="ctr" />
                <SortHeader label="Spend" sortKeyValue="cost" />
                <SortHeader label="CPC" sortKeyValue="cpc" />
                <SortHeader label="Orders" sortKeyValue="orders" />
                <SortHeader label="Sales" sortKeyValue="sales" />
                <SortHeader label="ACoS" sortKeyValue="acos" />
                <SortHeader label="ROAS" sortKeyValue="roas" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                    No campaigns found. Sync your data to load campaigns.
                  </td>
                </tr>
              ) : (
                sortedCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {campaign.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {campaign.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          campaign.state === 'enabled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {campaign.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {campaign.budget ? formatCurrency(campaign.budget) : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatNumber(campaign.clicks)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatPercent(campaign.ctr)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatCurrency(campaign.cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {campaign.cpc ? formatCurrency(campaign.cpc) : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatNumber(campaign.orders)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatCurrency(campaign.sales)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatPercent(campaign.acos)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {campaign.roas?.toFixed(2) ?? '--'}
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
