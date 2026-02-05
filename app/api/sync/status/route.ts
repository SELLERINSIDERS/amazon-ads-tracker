import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSyncStatus } from '@/lib/sync'

// GET /api/sync/status - Get current sync status
export async function GET() {
  try {
    // Get current profile
    const credential = await prisma.amazonCredential.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!credential?.profileId) {
      return NextResponse.json({
        data: {
          connected: false,
          status: 'idle',
          lastSyncAt: null,
          error: null,
        },
      })
    }

    const syncState = await getSyncStatus(credential.profileId)

    // Get campaign count
    const campaignCount = await prisma.campaign.count({
      where: { profileId: credential.profileId },
    })

    return NextResponse.json({
      data: {
        connected: true,
        status: syncState?.syncStatus || 'idle',
        lastSyncAt: syncState?.lastSyncAt?.toISOString() || null,
        error: syncState?.error || null,
        campaignCount,
      },
    })
  } catch (error) {
    console.error('Sync status error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
