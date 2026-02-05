import { Suspense } from 'react'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import { getKeywordsWithMetrics } from '@/lib/metrics'
import { prisma } from '@/lib/prisma'
import { DateRangeSelector } from '@/components/date-range-selector'
import { ExportButton } from '@/components/export-button'
import { KeywordsTable } from './keywords-table'
import type { DateRangeKey } from '@/lib/types/date-range'

interface KeywordsPageProps {
  searchParams: {
    range?: string
    campaignId?: string
    adGroupId?: string
    matchType?: string
    campaignType?: string
  }
}

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  await verifySession()
  const connectionStatus = await getConnectionStatus()
  const range = (searchParams.range as DateRangeKey) || '30d'

  if (!connectionStatus.profileId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Keywords</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your keyword bids and targeting
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">
            Connect your Amazon Ads account to view keywords.{' '}
            <Link href="/settings" className="text-blue-600 underline hover:text-blue-800">
              Go to Settings
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Get campaigns for filter dropdown (SP and SB only - SD has no keywords)
  const campaigns = await prisma.campaign.findMany({
    where: { profileId: connectionStatus.profileId, type: { in: ['SP', 'SB'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true },
  })

  // Get ad groups for filter dropdown (filtered by campaign if selected)
  const adGroups = await prisma.adGroup.findMany({
    where: {
      campaign: { profileId: connectionStatus.profileId },
      ...(searchParams.campaignId && { campaignId: searchParams.campaignId }),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, campaignId: true },
  })

  const keywords = await getKeywordsWithMetrics(connectionStatus.profileId, range, {
    campaignId: searchParams.campaignId,
    adGroupId: searchParams.adGroupId,
    matchType: searchParams.matchType,
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Keywords</h2>
          <p className="mt-1 text-sm text-gray-500">
            {keywords.length} keyword{keywords.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton endpoint="/api/export/keywords" />
          <Suspense fallback={<div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />}>
            <DateRangeSelector />
          </Suspense>
        </div>
      </div>

      <KeywordsTable
        keywords={keywords}
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
