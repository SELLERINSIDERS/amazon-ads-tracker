import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import { getCampaignsWithMetrics } from '@/lib/metrics'
import { DateRangeSelector } from '@/components/date-range-selector'
import { ExportButton } from '@/components/export-button'
import { CampaignTable } from './campaign-table'
import type { DateRangeKey } from '@/lib/types/date-range'
import Link from 'next/link'

interface CampaignsPageProps {
  searchParams: { range?: string; type?: string; status?: string }
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  await verifySession()
  const connectionStatus = await getConnectionStatus()
  const range = (searchParams.range as DateRangeKey) || '30d'

  if (!connectionStatus.profileId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your Amazon advertising campaigns
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">
            Connect your Amazon Ads account to view campaigns.{' '}
            <Link href="/settings" className="text-blue-600 underline hover:text-blue-800">
              Go to Settings
            </Link>
          </p>
        </div>
      </div>
    )
  }

  const campaigns = await getCampaignsWithMetrics(connectionStatus.profileId, range, {
    type: searchParams.type,
    status: searchParams.status,
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButton endpoint="/api/export/campaigns" />
          <Suspense fallback={<div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />}>
            <DateRangeSelector />
          </Suspense>
        </div>
      </div>

      <CampaignTable
        campaigns={campaigns}
        currentType={searchParams.type}
        currentStatus={searchParams.status}
      />
    </div>
  )
}
