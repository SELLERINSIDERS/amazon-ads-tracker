import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { syncCampaignData, getSyncStatus } from '@/lib/sync'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { logAction } from '@/lib/audit'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  // Get connection status
  const connection = await getConnectionStatus()
  if (!connection.profileId) {
    return apiError('NO_PROFILE', 'No Amazon profile selected', 400)
  }

  try {
    // Log the sync trigger
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'sync_triggered',
      entityType: 'profile',
      entityId: connection.profileId,
      entityName: connection.profileName || undefined,
      reason: 'Agent triggered sync',
    })

    // Trigger sync
    const result = await syncCampaignData()

    // Get updated sync status
    const syncStatus = await getSyncStatus(connection.profileId)

    return apiResponse({
      success: result.success,
      stats: result.stats,
      syncStatus: syncStatus?.syncStatus,
      lastSyncAt: syncStatus?.lastSyncAt,
      error: result.error,
    })
  } catch (error) {
    console.error('Error triggering sync:', error)
    return apiError('SYNC_ERROR', 'Failed to trigger sync', 500)
  }
}
