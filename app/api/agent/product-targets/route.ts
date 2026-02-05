import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { createProductTargets } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

// GET - List product targets
export async function GET(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  // Get connection status
  const connection = await getConnectionStatus()
  if (!connection.profileId) {
    return apiError('NO_PROFILE', 'No Amazon profile selected', 400)
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const adGroupId = searchParams.get('adGroupId') || undefined
  const campaignType = searchParams.get('campaignType') || undefined

  try {
    const where: {
      adGroup: { campaign: { profileId: string } }
      adGroupId?: string
      campaignType?: string
    } = {
      adGroup: { campaign: { profileId: connection.profileId } },
    }

    if (adGroupId) {
      where.adGroupId = adGroupId
    }

    if (campaignType) {
      where.campaignType = campaignType
    }

    const productTargets = await prisma.productTarget.findMany({
      where,
      include: {
        adGroup: {
          select: {
            name: true,
            campaign: { select: { name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse({
      productTargets: productTargets.map((pt) => {
        let parsedExpression
        try {
          parsedExpression = JSON.parse(pt.expression)
        } catch {
          parsedExpression = pt.expression
        }
        return {
          id: pt.id,
          adGroupId: pt.adGroupId,
          adGroupName: pt.adGroup.name,
          campaignName: pt.adGroup.campaign.name,
          campaignType: pt.campaignType,
          targetType: pt.targetType,
          expressionType: pt.expressionType,
          expression: parsedExpression,
          state: pt.state,
          bid: pt.bid,
          createdAt: pt.createdAt,
        }
      }),
      total: productTargets.length,
    })
  } catch (error) {
    console.error('Error fetching product targets:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch product targets', 500)
  }
}

// POST - Create product targets
export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { adGroupId, targets, reason } = body as {
      adGroupId: string
      targets: Array<{
        expression: Array<{ type: string; value?: string }>
        bid?: number
      }>
      reason?: string
    }

    // Validate required fields
    if (!adGroupId || !targets || !Array.isArray(targets) || targets.length === 0) {
      return apiError('INVALID_INPUT', 'adGroupId and targets array are required', 400)
    }

    // Validate each target
    for (const target of targets) {
      if (!target.expression || !Array.isArray(target.expression) || target.expression.length === 0) {
        return apiError('INVALID_INPUT', 'Each target must have an expression array', 400)
      }
      for (const expr of target.expression) {
        if (!expr.type) {
          return apiError('INVALID_INPUT', 'Each expression must have a type', 400)
        }
      }
      if (target.bid !== undefined && (typeof target.bid !== 'number' || target.bid < 0.02)) {
        return apiError('INVALID_INPUT', 'Target bid must be at least $0.02', 400)
      }
    }

    // Verify ad group exists and get campaign info
    const adGroup = await prisma.adGroup.findUnique({
      where: { id: adGroupId },
      include: { campaign: true },
    })

    if (!adGroup) {
      return apiError('NOT_FOUND', 'Ad group not found', 404)
    }

    const campaignType = adGroup.campaign.type as CampaignType

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Create in Amazon first
    const targetsWithCampaign = targets.map((t) => ({
      adGroupId,
      campaignId: adGroup.campaignId,
      expression: t.expression,
      bid: t.bid,
    }))

    const amazonResult = await createProductTargets(apiOpts, campaignType, targetsWithCampaign)

    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'target_add',
        entityType: 'product_target',
        entityId: '',
        entityName: `${targets.length} targets`,
        afterState: {
          adGroupId,
          targets: targets.map((t) => ({
            expression: t.expression,
            bid: t.bid,
          })),
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to create targets in Amazon', 500)
    }

    const targetIds = amazonResult.targetIds || []
    if (targetIds.length === 0) {
      return apiError('AMAZON_API_ERROR', 'No target IDs returned from Amazon', 500)
    }

    // Create in local database
    const createdTargets = await Promise.all(
      targetIds.map((targetId, index) =>
        prisma.productTarget.create({
          data: {
            id: String(targetId),
            adGroupId,
            campaignType,
            targetType: targets[index].expression[0]?.type || 'unknown',
            expressionType: 'manual',
            expression: JSON.stringify(targets[index].expression),
            state: 'enabled',
            bid: targets[index].bid || null,
          },
        })
      )
    )

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'target_add',
      entityType: 'product_target',
      entityId: targetIds.join(','),
      entityName: `${createdTargets.length} targets`,
      afterState: {
        adGroupId,
        adGroupName: adGroup.name,
        campaignId: adGroup.campaignId,
        campaignName: adGroup.campaign.name,
        campaignType,
        targets: createdTargets.map((t) => {
          let parsedExpr
          try {
            parsedExpr = JSON.parse(t.expression)
          } catch {
            parsedExpr = t.expression
          }
          return {
            id: t.id,
            targetType: t.targetType,
            expression: parsedExpr,
            bid: t.bid,
            state: t.state,
          }
        }),
      },
      reason,
      success: true,
    })

    return apiResponse({
      adGroupId,
      adGroupName: adGroup.name,
      campaignId: adGroup.campaignId,
      campaignName: adGroup.campaign.name,
      campaignType,
      targets: createdTargets.map((t) => {
        let parsedExpr
        try {
          parsedExpr = JSON.parse(t.expression)
        } catch {
          parsedExpr = t.expression
        }
        return {
          targetId: t.id,
          targetType: t.targetType,
          expression: parsedExpr,
          bid: t.bid,
          state: t.state,
        }
      }),
      count: createdTargets.length,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error creating product targets:', error)
    return apiError('CREATE_ERROR', 'Failed to create product targets', 500)
  }
}
