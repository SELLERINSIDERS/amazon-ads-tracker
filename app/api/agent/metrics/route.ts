import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { getDashboardMetrics, getCampaignCount } from '@/lib/metrics'
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
  const range = (searchParams.get('range') as DateRangeKey) || '30d'

  try {
    const [metrics, campaignCounts] = await Promise.all([
      getDashboardMetrics(connection.profileId, range),
      getCampaignCount(connection.profileId),
    ])

    return apiResponse(
      {
        currentPeriod: {
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          cost: metrics.cost,
          orders: metrics.orders,
          sales: metrics.sales,
          acos: metrics.acos,
          roas: metrics.roas,
          ctr: metrics.ctr,
          cpc: metrics.cpc,
        },
        previousPeriod: metrics.previousPeriod,
        trends: metrics.trends,
        campaigns: campaignCounts,
      },
      { range }
    )
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch metrics', 500)
  }
}
