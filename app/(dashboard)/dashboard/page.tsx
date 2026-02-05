import Link from 'next/link'
import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import { SyncStatus } from '@/components/sync-status'
import { MetricCard } from '@/components/metric-card'
import { DateRangeSelector } from '@/components/date-range-selector'
import { getDashboardMetrics, getCampaignCount } from '@/lib/metrics'
import type { DateRangeKey } from '@/lib/types/date-range'

interface DashboardPageProps {
  searchParams: { range?: string }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await verifySession()
  const connectionStatus = await getConnectionStatus()
  const range = (searchParams.range as DateRangeKey) || '30d'

  // Get metrics if connected
  let metrics = null
  let campaignCounts = { total: 0, enabled: 0, paused: 0 }

  if (connectionStatus.profileId) {
    [metrics, campaignCounts] = await Promise.all([
      getDashboardMetrics(connectionStatus.profileId, range),
      getCampaignCount(connectionStatus.profileId),
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to the PPC Command Center
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />}>
          <DateRangeSelector />
        </Suspense>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Spend"
          value={metrics?.cost ?? 0}
          trend={metrics?.trends.cost}
          format="currency"
          subtitle={!metrics ? 'Connect to view' : undefined}
        />
        <MetricCard
          title="ACoS"
          value={metrics?.acos ?? 0}
          trend={metrics?.trends.acos}
          format="percent"
          subtitle={!metrics ? 'Connect to view' : undefined}
        />
        <MetricCard
          title="ROAS"
          value={metrics?.roas?.toFixed(2) ?? '0.00'}
          trend={metrics?.trends.roas}
          subtitle={!metrics ? 'Connect to view' : undefined}
        />
        <MetricCard
          title="Campaigns"
          value={campaignCounts.total}
          subtitle={`${campaignCounts.enabled} active, ${campaignCounts.paused} paused`}
        />
      </div>

      {/* Second row of metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Impressions"
          value={metrics?.impressions ?? 0}
          trend={metrics?.trends.impressions}
          format="number"
        />
        <MetricCard
          title="Clicks"
          value={metrics?.clicks ?? 0}
          trend={metrics?.trends.clicks}
          format="number"
        />
        <MetricCard
          title="CTR"
          value={metrics?.ctr ?? 0}
          format="percent"
        />
        <MetricCard
          title="Orders"
          value={metrics?.orders ?? 0}
          trend={metrics?.trends.orders}
          format="number"
        />
        <MetricCard
          title="Sales"
          value={metrics?.sales ?? 0}
          trend={metrics?.trends.sales}
          format="currency"
        />
      </div>

      {/* Alerts section */}
      {campaignCounts.paused > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">Alerts</h3>
          <ul className="mt-2 text-sm text-yellow-700 space-y-1">
            <li>
              {campaignCounts.paused} campaign{campaignCounts.paused > 1 ? 's' : ''} paused
            </li>
          </ul>
        </div>
      )}

      {/* Connection and Sync status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Amazon Ads Connection</h3>
          {connectionStatus.connected ? (
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
                {connectionStatus.profileName && (
                  <span className="text-sm text-gray-600">
                    {connectionStatus.profileName}
                  </span>
                )}
              </div>
              {!connectionStatus.profileId && (
                <p className="mt-2 text-sm text-yellow-600">
                  No profile selected.{' '}
                  <Link href="/settings" className="underline hover:text-yellow-800">
                    Select a profile in Settings
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Not connected.{' '}
              <Link href="/settings" className="text-blue-600 underline hover:text-blue-800">
                Connect in Settings
              </Link>
            </p>
          )}
        </div>

        <SyncStatus />
      </div>

      {/* Placeholders for future features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Status</h3>
          <p className="mt-2 text-sm text-gray-500">
            Agent integration coming in Phase 7.
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Actions</h3>
          <p className="mt-2 text-sm text-gray-500">
            Audit logging coming in Phase 6.
          </p>
        </div>
      </div>
    </div>
  )
}
