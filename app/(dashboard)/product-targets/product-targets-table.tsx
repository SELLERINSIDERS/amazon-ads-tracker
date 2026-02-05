'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ProductTarget {
  id: string
  targetType: string
  expressionType: string
  expression: string
  state: string
  bid: number | null
  campaignId: string
  campaignName: string
  campaignType: string
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
  type?: string
  campaignId?: string
}

interface ProductTargetsTableProps {
  productTargets: ProductTarget[]
  campaigns: FilterOption[]
  adGroups: FilterOption[]
  currentCampaignId?: string
  currentAdGroupId?: string
  currentCampaignType?: string
}

type SortKey =
  | 'expression'
  | 'campaignName'
  | 'campaignType'
  | 'adGroupName'
  | 'targetType'
  | 'state'
  | 'bid'
  | 'impressions'
  | 'clicks'
  | 'cost'
  | 'orders'
  | 'sales'
  | 'acos'
  | 'roas'
type SortDirection = 'asc' | 'desc'

const CAMPAIGN_TYPES = ['SP', 'SB', 'SD']

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

function formatTargetType(type: string): string {
  const typeMap: Record<string, string> = {
    asinSameAs: 'ASIN',
    asinCategorySameAs: 'Category',
    asinBrandSameAs: 'Brand',
    asinPriceBetween: 'Price Range',
    asinReviewRatingBetween: 'Rating',
    queryHighRelMatches: 'Close Match',
    queryBroadRelMatches: 'Loose Match',
    asinSubstituteRelated: 'Substitutes',
    asinAccessoryRelated: 'Complements',
  }
  return typeMap[type] || type
}

function formatExpression(expression: string, targetType: string): string {
  try {
    const parsed = JSON.parse(expression)

    if (Array.isArray(parsed)) {
      return parsed.map((expr) => formatSingleExpr(expr, targetType)).join(', ')
    }

    return formatSingleExpr(parsed, targetType)
  } catch {
    return expression.substring(0, 30) + (expression.length > 30 ? '...' : '')
  }
}

function formatSingleExpr(
  expr: { type?: string; value?: string },
  targetType: string
): string {
  const value = expr.value || 'Unknown'

  if (expr.type === 'asinSameAs' || targetType === 'asinSameAs') {
    return value
  }
  if (expr.type === 'asinCategorySameAs' || targetType === 'asinCategorySameAs') {
    return value.length > 20 ? value.substring(0, 20) + '...' : value
  }
  if (expr.type === 'asinBrandSameAs' || targetType === 'asinBrandSameAs') {
    return value
  }

  return value.substring(0, 20) + (value.length > 20 ? '...' : '')
}

export function ProductTargetsTable({
  productTargets,
  campaigns,
  adGroups,
  currentCampaignId,
  currentAdGroupId,
  currentCampaignType,
}: ProductTargetsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sortKey, setSortKey] = useState<SortKey>('impressions')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc') // Default to desc for metrics
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
    // Reset campaign and adGroup when campaignType changes
    if (filterKey === 'campaignType') {
      params.delete('campaignId')
      params.delete('adGroupId')
    }
    router.push(`?${params.toString()}`)
  }

  // Filter campaigns by type if a type is selected
  const filteredCampaigns = currentCampaignType
    ? campaigns.filter((c) => c.type === currentCampaignType)
    : campaigns

  const filteredAdGroups = currentCampaignId
    ? adGroups.filter((ag) => ag.campaignId === currentCampaignId)
    : adGroups

  const sortedTargets = useMemo(() => {
    return [...productTargets].sort((a, b) => {
      let aVal: string | number | null
      let bVal: string | number | null

      switch (sortKey) {
        case 'expression':
          aVal = formatExpression(a.expression, a.targetType)
          bVal = formatExpression(b.expression, b.targetType)
          break
        case 'campaignName':
          aVal = a.campaignName
          bVal = b.campaignName
          break
        case 'campaignType':
          aVal = a.campaignType
          bVal = b.campaignType
          break
        case 'adGroupName':
          aVal = a.adGroupName
          bVal = b.adGroupName
          break
        case 'targetType':
          aVal = a.targetType
          bVal = b.targetType
          break
        case 'state':
          aVal = a.state
          bVal = b.state
          break
        case 'bid':
          aVal = a.bid
          bVal = b.bid
          break
        case 'impressions':
          aVal = a.impressions
          bVal = b.impressions
          break
        case 'clicks':
          aVal = a.clicks
          bVal = b.clicks
          break
        case 'cost':
          aVal = a.cost
          bVal = b.cost
          break
        case 'orders':
          aVal = a.orders
          bVal = b.orders
          break
        case 'sales':
          aVal = a.sales
          bVal = b.sales
          break
        case 'acos':
          aVal = a.acos
          bVal = b.acos
          break
        case 'roas':
          aVal = a.roas
          bVal = b.roas
          break
        default:
          return 0
      }

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
  }, [productTargets, sortKey, sortDirection])

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
            Campaign Type
          </label>
          <select
            value={currentCampaignType || ''}
            onChange={(e) => handleFilterChange('campaignType', e.target.value)}
            className="block rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All Types</option>
            {CAMPAIGN_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'SP'
                  ? 'Sponsored Products'
                  : type === 'SB'
                  ? 'Sponsored Brands'
                  : 'Sponsored Display'}
              </option>
            ))}
          </select>
        </div>
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
            {filteredCampaigns.map((campaign) => (
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
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortHeader label="Target" sortKeyValue="expression" className="min-w-[150px]" />
                <SortHeader label="Type" sortKeyValue="targetType" />
                <SortHeader label="Campaign" sortKeyValue="campaignName" />
                <SortHeader label="C.Type" sortKeyValue="campaignType" />
                <SortHeader label="Ad Group" sortKeyValue="adGroupName" />
                <SortHeader label="Status" sortKeyValue="state" />
                <SortHeader label="Bid" sortKeyValue="bid" />
                <SortHeader label="Impr." sortKeyValue="impressions" />
                <SortHeader label="Clicks" sortKeyValue="clicks" />
                <SortHeader label="Spend" sortKeyValue="cost" />
                <SortHeader label="Orders" sortKeyValue="orders" />
                <SortHeader label="Sales" sortKeyValue="sales" />
                <SortHeader label="ACoS" sortKeyValue="acos" />
                <SortHeader label="ROAS" sortKeyValue="roas" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTargets.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    No product targets found. Try adjusting your filters or sync
                    your data.
                  </td>
                </tr>
              ) : (
                sortedTargets.map((target) => (
                  <tr key={target.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 text-sm font-medium text-gray-900 max-w-[150px]">
                      <div className="truncate" title={target.expression}>
                        {formatExpression(target.expression, target.targetType)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {formatTargetType(target.targetType)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[120px]">
                      {target.campaignName}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {target.campaignType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500 truncate max-w-[120px]">
                      {target.adGroupName}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          target.state === 'enabled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {target.state}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(target.bid)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(target.impressions)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(target.clicks)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(target.cost)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatNumber(target.orders)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatCurrency(target.sales)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {formatPercent(target.acos)}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {target.roas?.toFixed(2) ?? '--'}
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
