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
  fetchAllNegativeKeywords,
  fetchAllProductTargets,
} from './amazon-api'
import {
  fetchAllCampaignMetrics,
  fetchAllKeywordMetrics,
  fetchAllProductTargetMetrics,
  getDateRange,
} from './amazon-reports'
import type {
  NormalizedCampaign,
  NormalizedAdGroup,
  NormalizedKeyword,
  NormalizedNegativeKeyword,
  NormalizedProductTarget,
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

// Check if entity was recently pushed to Amazon (within last 5 minutes)
// If so, don't overwrite with sync data to avoid race conditions
const RECENT_PUSH_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

function isRecentlyPushed(lastPushedAt: Date | null): boolean {
  if (!lastPushedAt) return false
  return Date.now() - lastPushedAt.getTime() < RECENT_PUSH_THRESHOLD_MS
}

// Persist all data in atomic transaction with conflict detection
async function persistData(
  campaigns: NormalizedCampaign[],
  adGroups: NormalizedAdGroup[],
  keywords: NormalizedKeyword[],
  negativeKeywords: NormalizedNegativeKeyword[] = [],
  productTargets: NormalizedProductTarget[] = []
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Upsert campaigns with conflict detection
    for (const campaign of campaigns) {
      // Check if campaign was recently pushed
      const existing = await tx.campaign.findUnique({
        where: { id: campaign.id },
        select: { lastPushedAt: true, budget: true, state: true },
      })

      // Skip updating budget/state if recently pushed (avoid race condition)
      const skipMutableFields = existing && isRecentlyPushed(existing.lastPushedAt)
      if (skipMutableFields) {
        console.log(`[Sync] Skipping mutable fields for campaign ${campaign.id} - recently pushed`)
      }

      await tx.campaign.upsert({
        where: { id: campaign.id },
        update: {
          name: campaign.name,
          // Only update mutable fields if not recently pushed
          ...(skipMutableFields ? {} : {
            state: campaign.state,
            budget: campaign.budget,
          }),
          budgetType: campaign.budgetType,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          brandEntityId: campaign.brandEntityId,
          tactic: campaign.tactic,
          costType: campaign.costType,
          syncedAt: new Date(),
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
          brandEntityId: campaign.brandEntityId,
          tactic: campaign.tactic,
          costType: campaign.costType,
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

    // Upsert keywords with conflict detection
    for (const keyword of keywords) {
      // Check if keyword was recently pushed
      const existing = await tx.keyword.findUnique({
        where: { id: keyword.id },
        select: { lastPushedAt: true, bid: true, state: true },
      })

      // Skip updating bid/state if recently pushed (avoid race condition)
      const skipMutableFields = existing && isRecentlyPushed(existing.lastPushedAt)
      if (skipMutableFields) {
        console.log(`[Sync] Skipping mutable fields for keyword ${keyword.id} - recently pushed`)
      }

      await tx.keyword.upsert({
        where: { id: keyword.id },
        update: {
          keywordText: keyword.keywordText,
          matchType: keyword.matchType,
          campaignType: keyword.campaignType,
          // Only update mutable fields if not recently pushed
          ...(skipMutableFields ? {} : {
            state: keyword.state,
            bid: keyword.bid,
          }),
        },
        create: {
          id: keyword.id,
          adGroupId: keyword.adGroupId,
          keywordText: keyword.keywordText,
          matchType: keyword.matchType,
          state: keyword.state,
          bid: keyword.bid,
          campaignType: keyword.campaignType,
        },
      })
    }

    // Upsert negative keywords
    for (const negKeyword of negativeKeywords) {
      await tx.negativeKeyword.upsert({
        where: { id: negKeyword.id },
        update: {
          keywordText: negKeyword.keywordText,
          matchType: negKeyword.matchType,
          state: negKeyword.state,
          campaignType: negKeyword.campaignType,
          updatedAt: new Date(),
        },
        create: {
          id: negKeyword.id,
          campaignId: negKeyword.campaignId,
          adGroupId: negKeyword.adGroupId,
          keywordText: negKeyword.keywordText,
          matchType: negKeyword.matchType,
          state: negKeyword.state,
          campaignType: negKeyword.campaignType,
        },
      })
    }

    // Upsert product targets with conflict detection
    for (const target of productTargets) {
      // Check if target was recently pushed
      const existing = await tx.productTarget.findUnique({
        where: { id: target.id },
        select: { lastPushedAt: true, bid: true, state: true },
      })

      // Skip updating bid/state if recently pushed (avoid race condition)
      const skipMutableFields = existing && isRecentlyPushed(existing.lastPushedAt)
      if (skipMutableFields) {
        console.log(`[Sync] Skipping mutable fields for product target ${target.id} - recently pushed`)
      }

      await tx.productTarget.upsert({
        where: { id: target.id },
        update: {
          targetType: target.targetType,
          expressionType: target.expressionType,
          expression: target.expression,
          campaignType: target.campaignType,
          // Only update mutable fields if not recently pushed
          ...(skipMutableFields ? {} : {
            state: target.state,
            bid: target.bid,
          }),
        },
        create: {
          id: target.id,
          adGroupId: target.adGroupId,
          campaignType: target.campaignType,
          targetType: target.targetType,
          expressionType: target.expressionType,
          expression: target.expression,
          state: target.state,
          bid: target.bid,
        },
      })
    }
  })
}

// Persist campaign metrics
async function persistCampaignMetrics(
  metrics: Array<{
    campaignId: string
    date: string
    impressions: number
    clicks: number
    cost: number
    purchases30d: number
    sales30d: number
  }>
): Promise<number> {
  let count = 0

  for (const metric of metrics) {
    // Convert date from YYYY-MM-DD to YYYYMMDD format
    const dateFormatted = metric.date.replace(/-/g, '')

    try {
      await prisma.campaignMetric.upsert({
        where: {
          campaignId_date: {
            campaignId: String(metric.campaignId),
            date: dateFormatted,
          },
        },
        update: {
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
        create: {
          campaignId: String(metric.campaignId),
          date: dateFormatted,
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
      })
      count++
    } catch {
      // Skip if campaign doesn't exist (foreign key constraint)
      console.warn(`[Sync] Skipping metric for unknown campaign ${metric.campaignId}`)
    }
  }

  return count
}

// Persist keyword metrics
async function persistKeywordMetrics(
  metrics: Array<{
    keywordId: string
    adGroupId: string
    campaignId: string
    date: string
    impressions: number
    clicks: number
    cost: number
    purchases30d: number
    sales30d: number
  }>
): Promise<number> {
  let count = 0

  for (const metric of metrics) {
    // Convert date from YYYY-MM-DD to YYYYMMDD format
    const dateFormatted = metric.date.replace(/-/g, '')

    try {
      await prisma.keywordMetric.upsert({
        where: {
          keywordId_date: {
            keywordId: String(metric.keywordId),
            date: dateFormatted,
          },
        },
        update: {
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
        create: {
          keywordId: String(metric.keywordId),
          date: dateFormatted,
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
      })
      count++
    } catch {
      // Skip if keyword doesn't exist (foreign key constraint)
      console.warn(`[Sync] Skipping metric for unknown keyword ${metric.keywordId}`)
    }
  }

  return count
}

// Persist product target metrics
async function persistProductTargetMetrics(
  metrics: Array<{
    targetId: string
    adGroupId: string
    campaignId: string
    date: string
    impressions: number
    clicks: number
    cost: number
    purchases30d: number
    sales30d: number
  }>
): Promise<number> {
  let count = 0

  for (const metric of metrics) {
    // Convert date from YYYY-MM-DD to YYYYMMDD format
    const dateFormatted = metric.date.replace(/-/g, '')

    try {
      await prisma.productTargetMetric.upsert({
        where: {
          productTargetId_date: {
            productTargetId: String(metric.targetId),
            date: dateFormatted,
          },
        },
        update: {
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
        create: {
          productTargetId: String(metric.targetId),
          date: dateFormatted,
          impressions: metric.impressions || 0,
          clicks: metric.clicks || 0,
          cost: metric.cost || 0,
          orders: metric.purchases30d || 0,
          sales: metric.sales30d || 0,
        },
      })
      count++
    } catch {
      // Skip if product target doesn't exist (foreign key constraint)
      console.warn(`[Sync] Skipping metric for unknown product target ${metric.targetId}`)
    }
  }

  return count
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

    // Fetch all keywords (SP + SB)
    console.log('[Sync] Fetching keywords...')
    const keywords = await fetchAllKeywords(fetchOpts, adGroups, campaigns)
    console.log(`[Sync] Found ${keywords.length} keywords`)

    // Fetch all negative keywords (SP + SB)
    console.log('[Sync] Fetching negative keywords...')
    const negativeKeywords = await fetchAllNegativeKeywords(fetchOpts, campaigns)
    console.log(`[Sync] Found ${negativeKeywords.length} negative keywords`)

    // Fetch all product targets (SP + SB + SD)
    console.log('[Sync] Fetching product targets...')
    const productTargets = await fetchAllProductTargets(fetchOpts, adGroups, campaigns)
    console.log(`[Sync] Found ${productTargets.length} product targets`)

    // ========== PERSIST PHASE ==========
    console.log('[Sync] Starting persist phase...')
    await persistData(campaigns, adGroups, keywords, negativeKeywords, productTargets)
    console.log('[Sync] Data persisted successfully')

    // ========== METRICS PHASE ==========
    console.log('[Sync] Starting metrics phase...')

    // Fetch last 30 days of metrics
    const { startDate, endDate } = getDateRange(30)
    const metricsOpts = {
      accessToken,
      profileId,
      region,
      startDate,
      endDate,
    }

    // Fetch all campaign metrics (SP + SB + SD)
    console.log('[Sync] Fetching campaign metrics...')
    const campaignMetrics = await fetchAllCampaignMetrics(metricsOpts)
    const campaignMetricCount = await persistCampaignMetrics(campaignMetrics)
    console.log(`[Sync] Persisted ${campaignMetricCount} campaign metric rows`)

    // Fetch all keyword metrics (SP + SB)
    console.log('[Sync] Fetching keyword metrics...')
    const keywordMetrics = await fetchAllKeywordMetrics(metricsOpts)
    const keywordMetricCount = await persistKeywordMetrics(keywordMetrics)
    console.log(`[Sync] Persisted ${keywordMetricCount} keyword metric rows`)

    // Fetch all product target metrics (SP + SB + SD)
    console.log('[Sync] Fetching product target metrics...')
    const productTargetMetrics = await fetchAllProductTargetMetrics(metricsOpts)
    const productTargetMetricCount = await persistProductTargetMetrics(productTargetMetrics)
    console.log(`[Sync] Persisted ${productTargetMetricCount} product target metric rows`)

    // Update status to completed
    await setSyncStatus(profileId, 'completed')

    return {
      success: true,
      stats: {
        campaigns: campaigns.length,
        adGroups: adGroups.length,
        keywords: keywords.length,
        negativeKeywords: negativeKeywords.length,
        productTargets: productTargets.length,
        campaignMetrics: campaignMetricCount,
        keywordMetrics: keywordMetricCount,
        productTargetMetrics: productTargetMetricCount,
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
