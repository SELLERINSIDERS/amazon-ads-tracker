import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus, getAuthorizationUrl, getSafetyLimitsAction, getApiKeysAction } from './actions'
import { AmazonConnectionCard } from './amazon-connection-card'
import { SafetyLimitsCard } from './safety-limits-card'
import { AgentKeyCard } from './agent-key-card'

export default async function SettingsPage() {
  await verifySession()

  const [connectionStatus, authUrl, safetyLimits, apiKeys] = await Promise.all([
    getConnectionStatus(),
    getAuthorizationUrl(),
    getSafetyLimitsAction(),
    getApiKeysAction(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage your Amazon Ads API connection and preferences
        </p>
      </div>

      <AmazonConnectionCard
        connectionStatus={connectionStatus}
        authUrl={authUrl}
      />

      <SafetyLimitsCard initialLimits={safetyLimits} />

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Audit Log</h3>
            <p className="mt-2 text-sm text-gray-500">
              View all actions taken on your campaigns and keywords
            </p>
          </div>
          <Link
            href="/settings/audit"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            View Audit Log
          </Link>
        </div>
      </div>

      <AgentKeyCard initialKeys={apiKeys} />
    </div>
  )
}
