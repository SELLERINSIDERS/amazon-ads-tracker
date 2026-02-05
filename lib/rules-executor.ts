import { prisma } from './prisma'
import { getSafetyLimits, validateBidChange } from './safety'
import { logAction } from './audit'
import { getAmazonApiOptions } from './amazon-credentials'
import { updateSPKeywordBid, updateSPKeywordState } from './amazon-api-updates'
import type { AutomationRule } from '@prisma/client'
import type { EntityState } from './types/amazon-api'

interface KeywordWithMetrics {
  id: string
  keywordText: string
  state: string
  bid: number | null
  acos: number | null
  roas: number | null
  clicks: number
  impressions: number
  orders: number
  spend: number
}

interface ExecutionResult {
  entityId: string
  entityName: string
  result: 'success' | 'skipped' | 'failed'
  message?: string
}

// Check if rule condition is met for a keyword
function evaluateCondition(
  rule: AutomationRule,
  keyword: KeywordWithMetrics
): boolean {
  switch (rule.conditionType) {
    case 'acos_above':
      return keyword.acos !== null && keyword.acos > rule.conditionValue
    case 'acos_below':
      return keyword.acos !== null && keyword.acos < rule.conditionValue
    case 'roas_above':
      return keyword.roas !== null && keyword.roas > rule.conditionValue
    case 'roas_below':
      return keyword.roas !== null && keyword.roas < rule.conditionValue
    case 'clicks_above':
      return keyword.clicks > rule.conditionValue
    case 'impressions_above':
      return keyword.impressions > rule.conditionValue
    case 'orders_below':
      // Also require minimum clicks to avoid pausing new keywords
      return keyword.clicks >= 100 && keyword.orders < rule.conditionValue
    case 'spend_above':
      return keyword.spend > rule.conditionValue
    default:
      return false
  }
}

// Execute rule action on a keyword
async function executeAction(
  rule: AutomationRule,
  keyword: KeywordWithMetrics
): Promise<ExecutionResult> {
  const limits = await getSafetyLimits()
  const currentBid = keyword.bid || 0

  // Get Amazon API credentials for pushing changes
  const apiOpts = await getAmazonApiOptions()
  if (!apiOpts) {
    return {
      entityId: keyword.id,
      entityName: keyword.keywordText,
      result: 'failed',
      message: 'Amazon API not configured',
    }
  }

  switch (rule.actionType) {
    case 'decrease_bid': {
      const changePercent = rule.actionValue || 10
      const newBid = currentBid * (1 - changePercent / 100)

      // Validate against safety limits
      const validation = validateBidChange(currentBid, newBid, limits)
      if (!validation.valid) {
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: validation.error,
        }
      }

      // Push to Amazon API first
      const amazonResult = await updateSPKeywordBid(apiOpts, keyword.id, newBid)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'rule',
          actorId: rule.id,
          actionType: 'bid_change',
          entityType: 'keyword',
          entityId: keyword.id,
          entityName: keyword.keywordText,
          beforeState: { bid: currentBid },
          afterState: { bid: newBid },
          reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
          success: false,
          errorMsg: amazonResult.error,
        })
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: amazonResult.error || 'Amazon API error',
        }
      }

      // Update bid in local database
      await prisma.keyword.update({
        where: { id: keyword.id },
        data: { bid: newBid },
      })

      // Log to audit
      await logAction({
        actorType: 'rule',
        actorId: rule.id,
        actionType: 'bid_change',
        entityType: 'keyword',
        entityId: keyword.id,
        entityName: keyword.keywordText,
        beforeState: { bid: currentBid },
        afterState: { bid: newBid },
        reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
        success: true,
      })

      return {
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'success',
        message: `Bid decreased from $${currentBid.toFixed(2)} to $${newBid.toFixed(2)}`,
      }
    }

    case 'increase_bid': {
      const changePercent = rule.actionValue || 5
      const newBid = currentBid * (1 + changePercent / 100)

      // Validate against safety limits
      const validation = validateBidChange(currentBid, newBid, limits)
      if (!validation.valid) {
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: validation.error,
        }
      }

      // Push to Amazon API first
      const amazonResult = await updateSPKeywordBid(apiOpts, keyword.id, newBid)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'rule',
          actorId: rule.id,
          actionType: 'bid_change',
          entityType: 'keyword',
          entityId: keyword.id,
          entityName: keyword.keywordText,
          beforeState: { bid: currentBid },
          afterState: { bid: newBid },
          reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
          success: false,
          errorMsg: amazonResult.error,
        })
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: amazonResult.error || 'Amazon API error',
        }
      }

      // Update bid in local database
      await prisma.keyword.update({
        where: { id: keyword.id },
        data: { bid: newBid },
      })

      // Log to audit
      await logAction({
        actorType: 'rule',
        actorId: rule.id,
        actionType: 'bid_change',
        entityType: 'keyword',
        entityId: keyword.id,
        entityName: keyword.keywordText,
        beforeState: { bid: currentBid },
        afterState: { bid: newBid },
        reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
        success: true,
      })

      return {
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'success',
        message: `Bid increased from $${currentBid.toFixed(2)} to $${newBid.toFixed(2)}`,
      }
    }

    case 'pause': {
      if (keyword.state === 'paused') {
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'skipped',
          message: 'Already paused',
        }
      }

      // Push to Amazon API first
      const amazonResult = await updateSPKeywordState(apiOpts, keyword.id, 'paused' as EntityState)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'rule',
          actorId: rule.id,
          actionType: 'status_change',
          entityType: 'keyword',
          entityId: keyword.id,
          entityName: keyword.keywordText,
          beforeState: { state: keyword.state },
          afterState: { state: 'paused' },
          reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
          success: false,
          errorMsg: amazonResult.error,
        })
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: amazonResult.error || 'Amazon API error',
        }
      }

      // Update status in local database
      await prisma.keyword.update({
        where: { id: keyword.id },
        data: { state: 'paused' },
      })

      // Log to audit
      await logAction({
        actorType: 'rule',
        actorId: rule.id,
        actionType: 'status_change',
        entityType: 'keyword',
        entityId: keyword.id,
        entityName: keyword.keywordText,
        beforeState: { state: keyword.state },
        afterState: { state: 'paused' },
        reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
        success: true,
      })

      return {
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'success',
        message: 'Paused',
      }
    }

    case 'enable': {
      if (keyword.state === 'enabled') {
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'skipped',
          message: 'Already enabled',
        }
      }

      // Push to Amazon API first
      const amazonResult = await updateSPKeywordState(apiOpts, keyword.id, 'enabled' as EntityState)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'rule',
          actorId: rule.id,
          actionType: 'status_change',
          entityType: 'keyword',
          entityId: keyword.id,
          entityName: keyword.keywordText,
          beforeState: { state: keyword.state },
          afterState: { state: 'enabled' },
          reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
          success: false,
          errorMsg: amazonResult.error,
        })
        return {
          entityId: keyword.id,
          entityName: keyword.keywordText,
          result: 'failed',
          message: amazonResult.error || 'Amazon API error',
        }
      }

      // Update status in local database
      await prisma.keyword.update({
        where: { id: keyword.id },
        data: { state: 'enabled' },
      })

      // Log to audit
      await logAction({
        actorType: 'rule',
        actorId: rule.id,
        actionType: 'status_change',
        entityType: 'keyword',
        entityId: keyword.id,
        entityName: keyword.keywordText,
        beforeState: { state: keyword.state },
        afterState: { state: 'enabled' },
        reason: `Rule "${rule.name}": ${rule.conditionType} triggered`,
        success: true,
      })

      return {
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'success',
        message: 'Enabled',
      }
    }

    default:
      return {
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'failed',
        message: `Unknown action type: ${rule.actionType}`,
      }
  }
}

// Check if entity is within cooldown period
async function isInCooldown(
  rule: AutomationRule,
  entityId: string
): Promise<boolean> {
  const cooldownEnd = new Date()
  cooldownEnd.setHours(cooldownEnd.getHours() - rule.cooldownHours)

  const recentExecution = await prisma.ruleExecution.findFirst({
    where: {
      ruleId: rule.id,
      entityId,
      executedAt: { gte: cooldownEnd },
      result: 'success',
    },
  })

  return !!recentExecution
}

// Run a single rule against all matching keywords
export async function runRule(
  rule: AutomationRule,
  profileId: string
): Promise<ExecutionResult[]> {
  if (!rule.enabled) {
    return []
  }

  // Only support keyword rules for now
  if (rule.conditionEntity !== 'keyword') {
    return []
  }

  // Get keywords with 30-day metrics
  const keywords = await prisma.keyword.findMany({
    where: {
      adGroup: {
        campaign: { profileId },
      },
      state: { not: 'archived' },
    },
    include: {
      metrics: {
        where: {
          date: {
            gte: formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          },
        },
      },
    },
  })

  const results: ExecutionResult[] = []

  for (const keyword of keywords) {
    // Aggregate metrics
    const aggregated = keyword.metrics.reduce(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        spend: acc.spend + m.cost,
        orders: acc.orders + m.orders,
        sales: acc.sales + m.sales,
      }),
      { impressions: 0, clicks: 0, spend: 0, orders: 0, sales: 0 }
    )

    const kwWithMetrics: KeywordWithMetrics = {
      id: keyword.id,
      keywordText: keyword.keywordText,
      state: keyword.state,
      bid: keyword.bid,
      acos:
        aggregated.sales > 0
          ? (aggregated.spend / aggregated.sales) * 100
          : null,
      roas: aggregated.spend > 0 ? aggregated.sales / aggregated.spend : null,
      clicks: aggregated.clicks,
      impressions: aggregated.impressions,
      orders: aggregated.orders,
      spend: aggregated.spend,
    }

    // Check condition
    if (!evaluateCondition(rule, kwWithMetrics)) {
      continue
    }

    // Check cooldown
    if (await isInCooldown(rule, keyword.id)) {
      results.push({
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: 'skipped',
        message: 'In cooldown period',
      })
      continue
    }

    // Execute action
    const result = await executeAction(rule, kwWithMetrics)
    results.push(result)

    // Log execution
    await prisma.ruleExecution.create({
      data: {
        ruleId: rule.id,
        entityType: 'keyword',
        entityId: keyword.id,
        entityName: keyword.keywordText,
        result: result.result,
        message: result.message,
      },
    })
  }

  // Update rule execution stats
  const successCount = results.filter((r) => r.result === 'success').length
  if (successCount > 0) {
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        lastExecutedAt: new Date(),
        executionCount: { increment: successCount },
      },
    })
  }

  return results
}

// Run all enabled rules
export async function runAllRules(
  profileId: string
): Promise<Map<string, ExecutionResult[]>> {
  const rules = await prisma.automationRule.findMany({
    where: { enabled: true },
  })

  const results = new Map<string, ExecutionResult[]>()

  for (const rule of rules) {
    const ruleResults = await runRule(rule, profileId)
    results.set(rule.id, ruleResults)
  }

  return results
}

// Format date as YYYYMMDD
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}
