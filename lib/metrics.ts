import { prisma } from './prisma'
import { getDateRangeFilter, type DateRangeKey } from './types/date-range'

export interface AggregatedMetrics {
  impressions: number
  clicks: number
  cost: number
  orders: number
  sales: number
  // Calculated
  acos: number | null
  roas: number | null
  ctr: number | null
  cpc: number | null
}

export interface MetricsWithTrend extends AggregatedMetrics {
  previousPeriod: AggregatedMetrics
  trends: {
    impressions: number | null
    clicks: number | null
    cost: number | null
    orders: number | null
    sales: number | null
    acos: number | null
    roas: number | null
  }
}

function calculateDerivedMetrics(metrics: {
  impressions: number
  clicks: number
  cost: number
  orders: number
  sales: number
}): AggregatedMetrics {
  const { impressions, clicks, cost, orders, sales } = metrics

  return {
    impressions,
    clicks,
    cost,
    orders,
    sales,
    acos: sales > 0 ? (cost / sales) * 100 : null,
    roas: cost > 0 ? sales / cost : null,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpc: clicks > 0 ? cost / clicks : null,
  }
}

function calculateTrend(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null
  return ((current - previous) / previous) * 100
}

export async function getDashboardMetrics(
  profileId: string,
  range: DateRangeKey = '30d'
): Promise<MetricsWithTrend> {
  const dateFilter = getDateRangeFilter(range)

  // Current period metrics
  const currentWhere = {
    campaign: { profileId },
    ...(dateFilter && {
      date: {
        gte: dateFilter.start,
        lte: dateFilter.end,
      },
    }),
  }

  const currentAgg = await prisma.campaignMetric.aggregate({
    where: currentWhere,
    _sum: {
      impressions: true,
      clicks: true,
      cost: true,
      orders: true,
      sales: true,
    },
  })

  const currentMetrics = calculateDerivedMetrics({
    impressions: currentAgg._sum.impressions || 0,
    clicks: currentAgg._sum.clicks || 0,
    cost: currentAgg._sum.cost || 0,
    orders: currentAgg._sum.orders || 0,
    sales: currentAgg._sum.sales || 0,
  })

  // Previous period metrics (same duration, before current period)
  let previousMetrics: AggregatedMetrics = {
    impressions: 0,
    clicks: 0,
    cost: 0,
    orders: 0,
    sales: 0,
    acos: null,
    roas: null,
    ctr: null,
    cpc: null,
  }

  if (dateFilter) {
    const days = parseInt(range.replace('d', '')) || 1
    const prevEnd = new Date()
    prevEnd.setDate(prevEnd.getDate() - days)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - days + 1)

    const formatPrevDate = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }

    const previousAgg = await prisma.campaignMetric.aggregate({
      where: {
        campaign: { profileId },
        date: {
          gte: formatPrevDate(prevStart),
          lte: formatPrevDate(prevEnd),
        },
      },
      _sum: {
        impressions: true,
        clicks: true,
        cost: true,
        orders: true,
        sales: true,
      },
    })

    previousMetrics = calculateDerivedMetrics({
      impressions: previousAgg._sum.impressions || 0,
      clicks: previousAgg._sum.clicks || 0,
      cost: previousAgg._sum.cost || 0,
      orders: previousAgg._sum.orders || 0,
      sales: previousAgg._sum.sales || 0,
    })
  }

  return {
    ...currentMetrics,
    previousPeriod: previousMetrics,
    trends: {
      impressions: calculateTrend(currentMetrics.impressions, previousMetrics.impressions),
      clicks: calculateTrend(currentMetrics.clicks, previousMetrics.clicks),
      cost: calculateTrend(currentMetrics.cost, previousMetrics.cost),
      orders: calculateTrend(currentMetrics.orders, previousMetrics.orders),
      sales: calculateTrend(currentMetrics.sales, previousMetrics.sales),
      acos: calculateTrend(currentMetrics.acos, previousMetrics.acos),
      roas: calculateTrend(currentMetrics.roas, previousMetrics.roas),
    },
  }
}

export async function getCampaignCount(profileId: string): Promise<{
  total: number
  enabled: number
  paused: number
}> {
  const [total, enabled, paused] = await Promise.all([
    prisma.campaign.count({ where: { profileId } }),
    prisma.campaign.count({ where: { profileId, state: 'enabled' } }),
    prisma.campaign.count({ where: { profileId, state: 'paused' } }),
  ])

  return { total, enabled, paused }
}

export async function getKeywordsWithMetrics(
  profileId: string,
  range: DateRangeKey = '30d',
  filters?: {
    campaignId?: string
    adGroupId?: string
    matchType?: string
  }
) {
  const dateFilter = getDateRangeFilter(range)

  const keywords = await prisma.keyword.findMany({
    where: {
      adGroup: {
        campaign: { profileId },
        ...(filters?.campaignId && { campaignId: filters.campaignId }),
      },
      ...(filters?.adGroupId && { adGroupId: filters.adGroupId }),
      ...(filters?.matchType && { matchType: filters.matchType }),
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
    orderBy: { keywordText: 'asc' },
  })

  return keywords.map((keyword) => {
    const aggregated = keyword.metrics.reduce(
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
      id: keyword.id,
      keywordText: keyword.keywordText,
      matchType: keyword.matchType,
      state: keyword.state,
      bid: keyword.bid,
      campaignId: keyword.adGroup.campaignId,
      campaignName: keyword.adGroup.campaign.name,
      campaignType: keyword.adGroup.campaign.type,
      adGroupId: keyword.adGroupId,
      adGroupName: keyword.adGroup.name,
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

export async function getCampaignsWithMetrics(
  profileId: string,
  range: DateRangeKey = '30d',
  filters?: {
    type?: string
    status?: string
  }
) {
  const dateFilter = getDateRangeFilter(range)

  const campaigns = await prisma.campaign.findMany({
    where: {
      profileId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { state: filters.status }),
    },
    include: {
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
    orderBy: { name: 'asc' },
  })

  return campaigns.map((campaign) => {
    const aggregated = campaign.metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        cost: acc.cost + m.cost,
        orders: acc.orders + m.orders,
        sales: acc.sales + m.sales,
      }),
      { impressions: 0, clicks: 0, cost: 0, orders: 0, sales: 0 }
    )

    const derived = calculateDerivedMetrics(aggregated)

    return {
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      state: campaign.state,
      budget: campaign.budget,
      brandEntityId: campaign.brandEntityId,
      tactic: campaign.tactic,
      costType: campaign.costType,
      ...derived,
    }
  })
}
