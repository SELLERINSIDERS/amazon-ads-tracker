import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { getSafetyLimits, validateBidChange } from '@/lib/safety'
import { updateProductTargetBid, updateProductTargetState, archiveProductTarget } from '@/lib/amazon-api-updates'
import type { CampaignType, EntityState } from '@/lib/types/amazon-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get a single product target
export async function GET(request: NextRequest, context: RouteParams) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  const { id } = await context.params

  try {
    const productTarget = await prisma.productTarget.findUnique({
      where: { id },
      include: {
        adGroup: {
          select: {
            name: true,
            campaign: { select: { name: true, type: true } },
          },
        },
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    })

    if (!productTarget) {
      return apiError('NOT_FOUND', 'Product target not found', 404)
    }

    let parsedExpression
    try {
      parsedExpression = JSON.parse(productTarget.expression)
    } catch {
      parsedExpression = productTarget.expression
    }

    return apiResponse({
      id: productTarget.id,
      adGroupId: productTarget.adGroupId,
      adGroupName: productTarget.adGroup.name,
      campaignName: productTarget.adGroup.campaign.name,
      campaignType: productTarget.campaignType,
      targetType: productTarget.targetType,
      expressionType: productTarget.expressionType,
      expression: parsedExpression,
      state: productTarget.state,
      bid: productTarget.bid,
      createdAt: productTarget.createdAt,
      metrics: productTarget.metrics,
    })
  } catch (error) {
    console.error('Error fetching product target:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch product target', 500)
  }
}

// PUT - Update product target (bid or state)
export async function PUT(request: NextRequest, context: RouteParams) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const { bid, state, reason } = body as {
      bid?: number
      state?: EntityState
      reason?: string
    }

    if (bid === undefined && state === undefined) {
      return apiError('INVALID_INPUT', 'Either bid or state must be provided', 400)
    }

    // Get the product target
    const productTarget = await prisma.productTarget.findUnique({
      where: { id },
      include: {
        adGroup: {
          select: { campaign: { select: { name: true, type: true } } },
        },
      },
    })

    if (!productTarget) {
      return apiError('NOT_FOUND', 'Product target not found', 404)
    }

    const campaignType = productTarget.campaignType as CampaignType

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Handle bid update
    if (bid !== undefined) {
      if (typeof bid !== 'number' || bid < 0.02) {
        return apiError('INVALID_INPUT', 'bid must be at least $0.02', 400)
      }

      const currentBid = productTarget.bid || 0
      const limits = await getSafetyLimits()
      const validation = validateBidChange(currentBid, bid, limits)

      if (!validation.valid) {
        await logAction({
          actorType: 'agent',
          actorId: authResult.context.apiKey.id,
          actionType: 'bid_change',
          entityType: 'product_target',
          entityId: id,
          entityName: productTarget.targetType,
          beforeState: { bid: currentBid },
          afterState: { bid },
          reason,
          success: false,
          errorMsg: validation.error,
        })
        return apiError('SAFETY_LIMIT', validation.error || 'Safety limit violated', 400)
      }

      const amazonResult = await updateProductTargetBid(apiOpts, campaignType, id, bid)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'agent',
          actorId: authResult.context.apiKey.id,
          actionType: 'bid_change',
          entityType: 'product_target',
          entityId: id,
          entityName: productTarget.targetType,
          beforeState: { bid: currentBid },
          afterState: { bid },
          reason,
          success: false,
          errorMsg: amazonResult.error,
        })
        return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
      }

      // Update local database
      await prisma.productTarget.update({
        where: { id },
        data: { bid, lastPushedAt: new Date() },
      })

      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'bid_change',
        entityType: 'product_target',
        entityId: id,
        entityName: productTarget.targetType,
        beforeState: { bid: currentBid },
        afterState: { bid },
        reason,
        success: true,
      })
    }

    // Handle state update
    if (state !== undefined) {
      if (!['enabled', 'paused', 'archived'].includes(state)) {
        return apiError('INVALID_INPUT', 'state must be enabled, paused, or archived', 400)
      }

      const currentState = productTarget.state

      const amazonResult = await updateProductTargetState(apiOpts, campaignType, id, state)
      if (!amazonResult.success) {
        await logAction({
          actorType: 'agent',
          actorId: authResult.context.apiKey.id,
          actionType: 'status_change',
          entityType: 'product_target',
          entityId: id,
          entityName: productTarget.targetType,
          beforeState: { state: currentState },
          afterState: { state },
          reason,
          success: false,
          errorMsg: amazonResult.error,
        })
        return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
      }

      // Update local database
      await prisma.productTarget.update({
        where: { id },
        data: { state, lastPushedAt: new Date() },
      })

      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'status_change',
        entityType: 'product_target',
        entityId: id,
        entityName: productTarget.targetType,
        beforeState: { state: currentState },
        afterState: { state },
        reason,
        success: true,
      })
    }

    // Return updated target
    const updated = await prisma.productTarget.findUnique({
      where: { id },
      include: {
        adGroup: {
          select: {
            name: true,
            campaign: { select: { name: true } },
          },
        },
      },
    })

    if (!updated) {
      return apiError('NOT_FOUND', 'Product target not found after update', 404)
    }

    let updatedExpression
    try {
      updatedExpression = JSON.parse(updated.expression)
    } catch {
      updatedExpression = updated.expression
    }

    return apiResponse({
      id: updated.id,
      adGroupId: updated.adGroupId,
      adGroupName: updated.adGroup.name,
      campaignName: updated.adGroup.campaign.name,
      campaignType: updated.campaignType,
      targetType: updated.targetType,
      expression: updatedExpression,
      state: updated.state,
      bid: updated.bid,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error updating product target:', error)
    return apiError('UPDATE_ERROR', 'Failed to update product target', 500)
  }
}

// DELETE - Archive product target
export async function DELETE(request: NextRequest, context: RouteParams) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  const { id } = await context.params
  const searchParams = request.nextUrl.searchParams
  const reason = searchParams.get('reason') || undefined

  try {
    // Get the product target
    const productTarget = await prisma.productTarget.findUnique({
      where: { id },
      include: {
        adGroup: {
          select: { campaign: { select: { name: true } } },
        },
      },
    })

    if (!productTarget) {
      return apiError('NOT_FOUND', 'Product target not found', 404)
    }

    const campaignType = productTarget.campaignType as CampaignType

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Archive in Amazon first
    const amazonResult = await archiveProductTarget(apiOpts, campaignType, id)
    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'target_remove',
        entityType: 'product_target',
        entityId: id,
        entityName: productTarget.targetType,
        beforeState: {
          state: productTarget.state,
          bid: productTarget.bid,
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to archive in Amazon', 500)
    }

    // Update state to archived in local database
    await prisma.productTarget.update({
      where: { id },
      data: { state: 'archived', lastPushedAt: new Date() },
    })

    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'target_remove',
      entityType: 'product_target',
      entityId: id,
      entityName: productTarget.targetType,
      beforeState: {
        state: productTarget.state,
        bid: productTarget.bid,
      },
      afterState: { state: 'archived' },
      reason,
      success: true,
    })

    return apiResponse({
      id,
      targetType: productTarget.targetType,
      deleted: true,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error deleting product target:', error)
    return apiError('DELETE_ERROR', 'Failed to delete product target', 500)
  }
}
