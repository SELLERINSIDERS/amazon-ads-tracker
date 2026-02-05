import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '../settings/actions'
import { SyncStatus } from '@/components/sync-status'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  // This will redirect to /login if not authenticated
  await verifySession()
  const connectionStatus = await getConnectionStatus()

  // Get campaign count if connected
  let campaignCount = 0
  if (connectionStatus.profileId) {
    campaignCount = await prisma.campaign.count({
      where: { profileId: connectionStatus.profileId },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to the PPC Command Center
        </p>
      </div>

      {/* Placeholder cards for future dashboard content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">$0.00</p>
          <p className="mt-1 text-sm text-gray-500">Coming in Phase 4</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">ACoS</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">0%</p>
          <p className="mt-1 text-sm text-gray-500">Coming in Phase 4</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Campaigns</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{campaignCount}</p>
          <p className="mt-1 text-sm text-gray-500">
            {campaignCount > 0 ? 'Synced' : 'Sync to load'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Agent Status</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Coming in Phase 7</p>
        </div>
      </div>

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
    </div>
  )
}
