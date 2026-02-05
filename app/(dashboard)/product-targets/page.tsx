import { Suspense } from 'react'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import {
  getProductTargetsWithMetrics,
  getCampaignsForProductTargets,
  getAdGroupsForProductTargets,
} from './actions'
import { DateRangeSelector } from '@/components/date-range-selector'
import { ExportButton } from '@/components/export-button'
import { ProductTargetsTable } from './product-targets-table'
import type { DateRangeKey } from '@/lib/types/date-range'

interface ProductTargetsPageProps {
  searchParams: {
    range?: string
    campaignId?: string
    adGroupId?: string
    campaignType?: string
  }
}

export default async function ProductTargetsPage({
  searchParams,
}: ProductTargetsPageProps) {
  await verifySession()
  const connectionStatus = await getConnectionStatus()
  const range = (searchParams.range as DateRangeKey) || '30d'

  if (!connectionStatus.profileId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Targets</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your product and category targeting
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">
            Connect your Amazon Ads account to view product targets.{' '}
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

  const [productTargets, campaigns, adGroups] = await Promise.all([
    getProductTargetsWithMetrics(connectionStatus.profileId, range, {
      campaignId: searchParams.campaignId,
      adGroupId: searchParams.adGroupId,
      campaignType: searchParams.campaignType,
    }),
    getCampaignsForProductTargets(connectionStatus.profileId),
    getAdGroupsForProductTargets(
      connectionStatus.profileId,
      searchParams.campaignId
    ),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Targets</h2>
          <p className="mt-1 text-sm text-gray-500">
            {productTargets.length} product target
            {productTargets.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton endpoint="/api/export/product-targets" />
          <Suspense
            fallback={
              <div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />
            }
          >
            <DateRangeSelector />
          </Suspense>
        </div>
      </div>

      <ProductTargetsTable
        productTargets={productTargets}
        campaigns={campaigns}
        adGroups={adGroups}
        currentCampaignId={searchParams.campaignId}
        currentAdGroupId={searchParams.adGroupId}
        currentCampaignType={searchParams.campaignType}
      />
    </div>
  )
}
