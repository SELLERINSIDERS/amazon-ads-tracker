import { NextRequest, NextResponse } from 'next/server'
import { syncCampaignData } from '@/lib/sync'

// GET /api/cron/sync - Trigger sync via cron job
// Secured with CRON_SECRET environment variable
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // In production, CRON_SECRET is required
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not set - cron endpoint disabled')
    return NextResponse.json(
      { error: 'Cron endpoint not configured' },
      { status: 503 }
    )
  }

  // Verify the secret matches
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  console.log('[Cron] Starting scheduled sync...')

  try {
    const result = await syncCampaignData()

    if (result.success) {
      console.log('[Cron] Sync completed:', result.stats)
      return NextResponse.json({
        success: true,
        message: 'Sync completed',
        stats: result.stats,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('[Cron] Sync failed:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[Cron] Sync error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
