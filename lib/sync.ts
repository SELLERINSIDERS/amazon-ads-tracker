/**
 * Data Sync Engine
 *
 * Implements two-phase sync pattern:
 * 1. Fetch Phase - Collect all data from Amazon API
 * 2. Persist Phase - Atomic database transaction to upsert all data
 */

import { prisma } from './prisma'
import {
  getValidAccessToken,
  getRegionFromCountryCode,
} from './amazon'
import {
  fetchAllCampaigns,
  fetchAllAdGroups,
  fetchAllKeywords,
} from './amazon-api'
import type {
  NormalizedCampaign,
  NormalizedAdGroup,
  NormalizedKeyword,
  SyncResult,
} from './types/amazon-api'

export type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed'

interface SyncStateRecord {
  profileId: string
  lastSyncAt: Date | null
  syncStatus: string
  error: string | null
  updatedAt: Date
}

// Update sync status in database
async function setSyncStatus(
  profileId: string,
  status: SyncStatus,
  error?: string
): Promise<void> {
  await prisma.syncState.upsert({
    where: { profileId },
    update: {
      syncStatus: status,
      error: error ?? null,
      lastSyncAt: status === 'completed' ? new Date() : undefined,
    },
    create: {
      profileId,
      syncStatus: status,
      error: error ?? null,
      lastSyncAt: status === 'completed' ? new Date() : null,
    },
  })
}

// Get sync status for a profile
export async function getSyncStatus(profileId: string): Promise<SyncStateRecord | null> {
  return prisma.syncState.findUnique({
    where: { profileId },
  })
}

// Persist all data in atomic transaction
async function persistData(
  campaigns: NormalizedCampaign[],
  adGroups: NormalizedAdGroup[],
  keywords: NormalizedKeyword[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Upsert campaigns
    for (const campaign of campaigns) {
      await tx.campaign.upsert({
        where: { id: campaign.id },
        update: {
          name: campaign.name,
          state: campaign.state,
          budget: campaign.budget,
          budgetType: campaign.budgetType,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          id: campaign.id,
          profileId: campaign.profileId,
          type: campaign.type,
          name: campaign.name,
          state: campaign.state,
          budget: campaign.budget,
          budgetType: campaign.budgetType,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          syncedAt: new Date(),
        },
      })
    }

    // Upsert ad groups
    for (const adGroup of adGroups) {
      await tx.adGroup.upsert({
        where: { id: adGroup.id },
        update: {
          name: adGroup.name,
          state: adGroup.state,
          defaultBid: adGroup.defaultBid,
          updatedAt: new Date(),
        },
        create: {
          id: adGroup.id,
          campaignId: adGroup.campaignId,
          name: adGroup.name,
          state: adGroup.state,
          defaultBid: adGroup.defaultBid,
        },
      })
    }

    // Upsert keywords
    for (const keyword of keywords) {
      await tx.keyword.upsert({
        where: { id: keyword.id },
        update: {
          keywordText: keyword.keywordText,
          matchType: keyword.matchType,
          state: keyword.state,
          bid: keyword.bid,
          updatedAt: new Date(),
        },
        create: {
          id: keyword.id,
          adGroupId: keyword.adGroupId,
          keywordText: keyword.keywordText,
          matchType: keyword.matchType,
          state: keyword.state,
          bid: keyword.bid,
        },
      })
    }
  })
}

// Main sync function
export async function syncCampaignData(): Promise<SyncResult> {
  // Get credentials
  const credential = await prisma.amazonCredential.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!credential || !credential.profileId) {
    return {
      success: false,
      error: 'No Amazon profile connected. Please connect and select a profile in Settings.',
    }
  }

  const profileId = credential.profileId

  // Check if already syncing
  const currentStatus = await getSyncStatus(profileId)
  if (currentStatus?.syncStatus === 'syncing') {
    return {
      success: false,
      error: 'Sync already in progress',
    }
  }

  // Update status to syncing
  await setSyncStatus(profileId, 'syncing')

  try {
    // Get valid access token (refresh if needed)
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
    const fetchOpts = { accessToken, profileId, region }

    // ========== FETCH PHASE ==========
    console.log('[Sync] Starting fetch phase...')

    // Fetch all campaigns
    console.log('[Sync] Fetching campaigns...')
    const campaigns = await fetchAllCampaigns(fetchOpts)
    console.log(`[Sync] Found ${campaigns.length} campaigns`)

    // Fetch all ad groups
    console.log('[Sync] Fetching ad groups...')
    const adGroups = await fetchAllAdGroups(fetchOpts, campaigns)
    console.log(`[Sync] Found ${adGroups.length} ad groups`)

    // Fetch all keywords (SP only for now)
    console.log('[Sync] Fetching keywords...')
    const spAdGroups = adGroups.filter((ag) => {
      const campaign = campaigns.find((c) => c.id === ag.campaignId)
      return campaign?.type === 'SP'
    })
    const keywords = await fetchAllKeywords(fetchOpts, spAdGroups)
    console.log(`[Sync] Found ${keywords.length} keywords`)

    // ========== PERSIST PHASE ==========
    console.log('[Sync] Starting persist phase...')
    await persistData(campaigns, adGroups, keywords)
    console.log('[Sync] Data persisted successfully')

    // Update status to completed
    await setSyncStatus(profileId, 'completed')

    return {
      success: true,
      stats: {
        campaigns: campaigns.length,
        adGroups: adGroups.length,
        keywords: keywords.length,
      },
    }
  } catch (error) {
    console.error('[Sync] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'

    // Update status to failed
    await setSyncStatus(profileId, 'failed', message)

    return {
      success: false,
      error: message,
    }
  }
}
