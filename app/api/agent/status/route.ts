import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { getSyncStatus } from '@/lib/sync'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const connection = await getConnectionStatus()

    // Get sync status if connected
    let syncStatus = null
    if (connection.profileId) {
      syncStatus = await getSyncStatus(connection.profileId)
    }

    // Get last agent heartbeat
    const lastHeartbeat = await prisma.agentHeartbeat.findFirst({
      orderBy: { timestamp: 'desc' },
    })

    return apiResponse({
      amazon: {
        connected: connection.connected,
        profileId: connection.profileId,
        profileName: connection.profileName,
        marketplace: connection.marketplace,
      },
      sync: syncStatus
        ? {
            lastSyncAt: syncStatus.lastSyncAt,
            status: syncStatus.syncStatus,
            error: syncStatus.error,
          }
        : null,
      agent: {
        lastHeartbeat: lastHeartbeat?.timestamp || null,
        lastStatus: lastHeartbeat?.status || null,
      },
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch status', 500)
  }
}
