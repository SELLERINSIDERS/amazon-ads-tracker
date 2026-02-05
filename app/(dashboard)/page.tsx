import { verifySession } from '@/lib/dal'

export default async function DashboardPage() {
  // This will redirect to /login if not authenticated
  const session = await verifySession()

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
          <p className="mt-2 text-3xl font-semibold text-gray-900">0</p>
          <p className="mt-1 text-sm text-gray-500">Coming in Phase 3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Agent Status</h3>
          <p className="mt-2 text-3xl font-semibold text-gray-900">--</p>
          <p className="mt-1 text-sm text-gray-500">Coming in Phase 7</p>
        </div>
      </div>

      {/* Connection status placeholder */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Amazon Ads Connection</h3>
        <p className="mt-2 text-sm text-gray-500">
          Not connected. Amazon API integration will be available in Phase 2.
        </p>
      </div>
    </div>
  )
}
