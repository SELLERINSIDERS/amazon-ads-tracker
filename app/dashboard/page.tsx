import { verifySession } from '@/lib/dal'
import { LogoutButton } from '@/components/logout-button'

export default async function DashboardPage() {
  // This will redirect to /login if not authenticated
  await verifySession()

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <LogoutButton />
        </div>
        <p className="text-gray-600">Welcome to the PPC Command Center</p>
      </div>
    </div>
  )
}
