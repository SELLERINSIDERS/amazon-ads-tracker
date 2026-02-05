'use client'

import Link from 'next/link'

interface AdGroup {
  id: string
  name: string
  state: string
  defaultBid: number | null
}

interface AdGroupsTableProps {
  adGroups: AdGroup[]
  campaignId: string
  campaignType: string
}

function formatCurrency(value: number | null): string {
  if (value === null) return '--'
  return `$${value.toFixed(2)}`
}

export function AdGroupsTable({ adGroups, campaignId, campaignType }: AdGroupsTableProps) {
  if (adGroups.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No ad groups found for this campaign.
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Default Bid
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {adGroups.map((adGroup) => (
            <tr key={adGroup.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                {adGroup.name}
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    adGroup.state === 'enabled'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {adGroup.state}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {formatCurrency(adGroup.defaultBid)}
              </td>
              <td className="px-4 py-3 text-sm space-x-3">
                {(campaignType === 'SP' || campaignType === 'SB') && (
                  <Link
                    href={`/keywords?campaignId=${campaignId}&adGroupId=${adGroup.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Keywords
                  </Link>
                )}
                <Link
                  href={`/product-targets?campaignId=${campaignId}&adGroupId=${adGroup.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Targets
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
