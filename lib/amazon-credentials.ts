/**
 * Helper to get Amazon API credentials for making API calls
 */

import { prisma } from './prisma'
import { getValidAccessToken, getRegionFromCountryCode, type AmazonRegion } from './amazon'

export interface AmazonApiOptions {
  accessToken: string
  profileId: string
  region: AmazonRegion
}

/**
 * Get Amazon API options (accessToken, profileId, region) from stored credentials.
 * Automatically refreshes the token if expired.
 */
export async function getAmazonApiOptions(): Promise<AmazonApiOptions | null> {
  const credential = await prisma.amazonCredential.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!credential || !credential.profileId) {
    return null
  }

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

  const region = getRegionFromCountryCode(credential.countryCode || 'US')

  return {
    accessToken,
    profileId: credential.profileId,
    region,
  }
}
