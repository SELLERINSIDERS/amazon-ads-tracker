import { NextResponse } from 'next/server'
import { syncCampaignData } from '@/lib/sync'

// POST /api/sync - Trigger sync
export async function POST() {
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
