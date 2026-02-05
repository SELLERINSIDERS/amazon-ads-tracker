import { Suspense } from 'react'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import {
  getNegativeKeywordsWithFilters,
  getCampaignsForNegativeKeywords,
  getAdGroupsForNegativeKeywords,
} from './actions'
import { DateRangeSelector } from '@/components/date-range-selector'
import { ExportButton } from '@/components/export-button'
import { NegativeKeywordsTable } from './negative-keywords-table'

interface NegativeKeywordsPageProps {
  searchParams: {
    range?: string
    campaignId?: string
    adGroupId?: string
    matchType?: string
    campaignType?: string
  }
}

export default async function NegativeKeywordsPage({
  searchParams,
}: NegativeKeywordsPageProps) {
  await verifySession()
  const connectionStatus = await getConnectionStatus()

  if (!connectionStatus.profileId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Negative Keywords</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your negative keyword targeting
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">
            Connect your Amazon Ads account to view negative keywords.{' '}
            <Link
              href="/settings"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Go to Settings
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const [negativeKeywords, campaigns, adGroups] = await Promise.all([
    getNegativeKeywordsWithFilters(connectionStatus.profileId, {
      campaignId: searchParams.campaignId,
      adGroupId: searchParams.adGroupId,
      matchType: searchParams.matchType,
      campaignType: searchParams.campaignType,
    }),
    getCampaignsForNegativeKeywords(connectionStatus.profileId),
    getAdGroupsForNegativeKeywords(
      connectionStatus.profileId,
      searchParams.campaignId
    ),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Negative Keywords</h2>
          <p className="mt-1 text-sm text-gray-500">
            {negativeKeywords.length} negative keyword
            {negativeKeywords.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton endpoint="/api/export/negative-keywords" />
          <Suspense
            fallback={
              <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
            }
          >
            <DateRangeSelector />
          </Suspense>
        </div>
      </div>

      <NegativeKeywordsTable
        negativeKeywords={negativeKeywords}
        campaigns={campaigns}
        adGroups={adGroups}
        currentCampaignId={searchParams.campaignId}
        currentAdGroupId={searchParams.adGroupId}
        currentMatchType={searchParams.matchType}
        currentCampaignType={searchParams.campaignType}
      />
    </div>
  )
}
