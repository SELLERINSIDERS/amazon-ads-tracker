import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { getCampaignsWithMetrics } from '@/lib/metrics'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import type { DateRangeKey } from '@/lib/types/date-range'

export async function GET(request: NextRequest) {
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

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || undefined
  const status = searchParams.get('status') || undefined
  const range = (searchParams.get('range') as DateRangeKey) || '30d'

  try {
    const campaigns = await getCampaignsWithMetrics(connection.profileId, range, {
      type,
      status,
    })

    return apiResponse(
      {
        campaigns,
        total: campaigns.length,
      },
      { range, filters: { type, status } }
    )
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch campaigns', 500)
  }
}
