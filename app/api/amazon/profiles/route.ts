import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  listProfiles,
  getValidAccessToken,
} from '@/lib/amazon'
import { withRateLimit } from '@/lib/rate-limiter'

// GET /api/amazon/profiles - List all advertising profiles
export async function GET() {
  try {
    // Get stored credentials
    const credential = await prisma.amazonCredential.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Not connected to Amazon Ads' },
        { status: 401 }
      )
    }

    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(
      {
        id: credential.id,
        accessToken: credential.accessToken,
        refreshToken: credential.refreshToken,
        expiresAt: credential.expiresAt,
      },
      async (id, newAccessToken, newExpiresAt) => {
        await prisma.amazonCredential.update({
          where: { id },
          data: {
            accessToken: newAccessToken,
            expiresAt: newExpiresAt,
          },
        })
      }
    )

    // List profiles with rate limiting
    const profiles = await withRateLimit(() => listProfiles(accessToken))

    return NextResponse.json({ data: profiles })
  } catch (error) {
    console.error('Error listing profiles:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/amazon/profiles - Select a profile
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { profileId, profileName, countryCode, marketplace } = body

    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId is required' },
        { status: 400 }
      )
    }

    // Update credential with selected profile
    const credential = await prisma.amazonCredential.findFirst({
      orderBy: { updatedAt: 'desc' },
    })

    if (!credential) {
      return NextResponse.json(
        { error: 'Not connected to Amazon Ads' },
        { status: 401 }
      )
    }

    await prisma.amazonCredential.update({
      where: { id: credential.id },
      data: {
        profileId: String(profileId),
        profileName: profileName || null,
        countryCode: countryCode || null,
        marketplace: marketplace || null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error selecting profile:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
