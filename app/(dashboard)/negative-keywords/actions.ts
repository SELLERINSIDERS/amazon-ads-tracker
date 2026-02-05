'use server'

import { prisma } from '@/lib/prisma'

export async function getNegativeKeywordsWithFilters(
  profileId: string,
  filters?: {
    campaignId?: string
    adGroupId?: string
    matchType?: string
    campaignType?: string
  }
) {
  const negativeKeywords = await prisma.negativeKeyword.findMany({
    where: {
      campaign: {
        profileId,
        type: { in: ['SP', 'SB'] }, // Only SP and SB have negative keywords
        ...(filters?.campaignType && { type: filters.campaignType }),
      },
      ...(filters?.campaignId && { campaignId: filters.campaignId }),
      ...(filters?.adGroupId && { adGroupId: filters.adGroupId }),
      ...(filters?.matchType && { matchType: filters.matchType }),
    },
    include: {
      campaign: true,
      adGroup: true,
    },
    orderBy: { keywordText: 'asc' },
  })

  return negativeKeywords.map((nk) => ({
    id: nk.id,
    keywordText: nk.keywordText,
    matchType: nk.matchType,
    state: nk.state,
    campaignId: nk.campaignId,
    campaignName: nk.campaign.name,
    campaignType: nk.campaign.type,
    adGroupId: nk.adGroupId,
    adGroupName: nk.adGroup?.name || null,
    level: (nk.adGroupId ? 'ad-group' : 'campaign') as 'campaign' | 'ad-group',
    createdAt: nk.createdAt,
  }))
}

export async function getCampaignsForNegativeKeywords(profileId: string) {
  // Only SP and SB campaigns have negative keywords
  return prisma.campaign.findMany({
    where: {
      profileId,
      type: { in: ['SP', 'SB'] },
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true },
  })
}

export async function getAdGroupsForNegativeKeywords(
  profileId: string,
  campaignId?: string
) {
  return prisma.adGroup.findMany({
    where: {
      campaign: {
        profileId,
        type: { in: ['SP', 'SB'] },
      },
      ...(campaignId && { campaignId }),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, campaignId: true },
  })
}
