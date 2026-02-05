import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { getKeywordsWithMetrics } from '@/lib/metrics'
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
  const campaignId = searchParams.get('campaignId') || undefined
  const adGroupId = searchParams.get('adGroupId') || undefined
  const matchType = searchParams.get('matchType') || undefined
  const range = (searchParams.get('range') as DateRangeKey) || '30d'

  try {
    const keywords = await getKeywordsWithMetrics(connection.profileId, range, {
      campaignId,
      adGroupId,
      matchType,
    })

    return apiResponse(
      {
        keywords,
        total: keywords.length,
      },
      { range, filters: { campaignId, adGroupId, matchType } }
    )
  } catch (error) {
    console.error('Error fetching keywords:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch keywords', 500)
  }
}
