import { verifySession } from '@/lib/dal'
import { getConnectionStatus, getAuthorizationUrl } from './actions'
import { AmazonConnectionCard } from './amazon-connection-card'

export default async function SettingsPage() {
  await verifySession()

  const [connectionStatus, authUrl] = await Promise.all([
    getConnectionStatus(),
    getAuthorizationUrl(),
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

      {/* Placeholder for future settings sections */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Safety Limits</h3>
        <p className="mt-2 text-sm text-gray-500">
          Configure bid and budget change limits. Coming in Phase 6.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Agent API Key</h3>
        <p className="mt-2 text-sm text-gray-500">
          Generate and manage API keys for external agents. Coming in Phase 7.
        </p>
      </div>
    </div>
  )
}
