import { NextResponse } from 'next/server'
import { syncCampaignData } from '@/lib/sync'
import { verifySession } from '@/lib/dal'

// POST /api/sync - Trigger sync (requires authentication)
export async function POST() {
  // Verify user is authenticated
  try {
    await verifySession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncCampaignData()

    if (result.success) {
      return NextResponse.json({
        data: {
          status: 'completed',
          stats: result.stats,
        },
      })
    } else {
      return NextResponse.json(
        {
          error: result.error,
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Sync API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
