'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface NegativeKeyword {
  id: string
  keywordText: string
  matchType: string
  state: string
  campaignId: string
  campaignName: string
  campaignType: string
  adGroupId: string | null
  adGroupName: string | null
  level: 'campaign' | 'ad-group'
  createdAt: Date
}

interface FilterOption {
  id: string
  name: string
  type?: string
  campaignId?: string
}

interface NegativeKeywordsTableProps {
  negativeKeywords: NegativeKeyword[]
  campaigns: FilterOption[]
  adGroups: FilterOption[]
  currentCampaignId?: string
  currentAdGroupId?: string
  currentMatchType?: string
  currentCampaignType?: string
}

type SortKey = 'keywordText' | 'campaignName' | 'campaignType' | 'matchType' | 'state' | 'level' | 'adGroupName'
type SortDirection = 'asc' | 'desc'

const MATCH_TYPES = ['negativeExact', 'negativePhrase']
const CAMPAIGN_TYPES = ['SP', 'SB']

function formatMatchType(matchType: string): string {
  if (matchType === 'negativeExact') return 'Negative Exact'
  if (matchType === 'negativePhrase') return 'Negative Phrase'
  return matchType
}

export function NegativeKeywordsTable({
  negativeKeywords,
  campaigns,
  adGroups,
  currentCampaignId,
  currentAdGroupId,
  currentMatchType,
  currentCampaignType,
}: NegativeKeywordsTableProps) {
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

  const sortedKeywords = useMemo(() => {
    return [...negativeKeywords].sort((a, b) => {
      let aVal: string | null = null
      let bVal: string | null = null

      switch (sortKey) {
        case 'keywordText':
          aVal = a.keywordText
          bVal = b.keywordText
          break
        case 'campaignName':
          aVal = a.campaignName
          bVal = b.campaignName
          break
        case 'campaignType':
          aVal = a.campaignType
          bVal = b.campaignType
          break
        case 'matchType':
          aVal = a.matchType
          bVal = b.matchType
          break
        case 'state':
          aVal = a.state
          bVal = b.state
          break
        case 'level':
          aVal = a.level
          bVal = b.level
          break
        case 'adGroupName':
          aVal = a.adGroupName
          bVal = b.adGroupName
          break
      }

      if (aVal === null) return 1
      if (bVal === null) return -1

      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    })
  }, [negativeKeywords, sortKey, sortDirection])

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
                {type === 'SP' ? 'Sponsored Products' : 'Sponsored Brands'}
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
                {formatMatchType(type)}
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
                <SortHeader label="Type" sortKeyValue="campaignType" />
                <SortHeader label="Level" sortKeyValue="level" />
                <SortHeader label="Ad Group" sortKeyValue="adGroupName" />
                <SortHeader label="Match Type" sortKeyValue="matchType" />
                <SortHeader label="Status" sortKeyValue="state" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedKeywords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No negative keywords found. Try adjusting your filters or sync your data.
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {keyword.campaignType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          keyword.level === 'campaign'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {keyword.level === 'campaign' ? 'Campaign' : 'Ad Group'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {keyword.adGroupName || '--'}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        {formatMatchType(keyword.matchType)}
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
