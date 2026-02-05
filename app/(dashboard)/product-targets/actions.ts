'use server'

import { prisma } from '@/lib/prisma'
import { getDateRangeFilter, type DateRangeKey } from '@/lib/types/date-range'

export async function getProductTargetsWithMetrics(
  profileId: string,
  range: DateRangeKey = '30d',
  filters?: {
    campaignId?: string
    adGroupId?: string
    campaignType?: string
  }
) {
  const dateFilter = getDateRangeFilter(range)

  const productTargets = await prisma.productTarget.findMany({
    where: {
      adGroup: {
        campaign: {
          profileId,
          ...(filters?.campaignType && { type: filters.campaignType }),
        },
        ...(filters?.campaignId && { campaignId: filters.campaignId }),
      },
      ...(filters?.adGroupId && { adGroupId: filters.adGroupId }),
    },
    include: {
      adGroup: {
        include: {
          campaign: true,
        },
      },
      metrics: dateFilter
        ? {
            where: {
              date: {
                gte: dateFilter.start,
                lte: dateFilter.end,
              },
            },
          }
        : true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return productTargets.map((target) => {
    const aggregated = target.metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        cost: acc.cost + m.cost,
        orders: acc.orders + m.orders,
        sales: acc.sales + m.sales,
      }),
      { impressions: 0, clicks: 0, cost: 0, orders: 0, sales: 0 }
    )

    const { impressions, clicks, cost, orders, sales } = aggregated
    const acos = sales > 0 ? (cost / sales) * 100 : null
    const roas = cost > 0 ? sales / cost : null
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : null
    const cpc = clicks > 0 ? cost / clicks : null

    return {
      id: target.id,
      targetType: target.targetType,
      expressionType: target.expressionType,
      expression: target.expression,
      state: target.state,
      bid: target.bid,
      campaignId: target.adGroup.campaignId,
      campaignName: target.adGroup.campaign.name,
      campaignType: target.campaignType,
      adGroupId: target.adGroupId,
      adGroupName: target.adGroup.name,
      impressions,
      clicks,
      cost,
      orders,
      sales,
      acos,
      roas,
      ctr,
      cpc,
    }
  })
}

export async function getCampaignsForProductTargets(profileId: string) {
  // All campaign types can have product targets
  return prisma.campaign.findMany({
    where: { profileId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, type: true },
  })
}

export async function getAdGroupsForProductTargets(
  profileId: string,
  campaignId?: string
) {
  return prisma.adGroup.findMany({
    where: {
      campaign: { profileId },
      ...(campaignId && { campaignId }),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, campaignId: true },
  })
}

