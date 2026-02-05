import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { getSafetyLimits, validateBudgetChange } from '@/lib/safety'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { updateCampaignBudget } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { campaignId, newBudget, reason } = body

    if (!campaignId || newBudget === undefined) {
      return apiError('INVALID_INPUT', 'campaignId and newBudget are required', 400)
    }

    if (typeof newBudget !== 'number' || newBudget < 0) {
      return apiError('INVALID_INPUT', 'newBudget must be a positive number', 400)
    }

    // Get campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404)
    }

    const currentBudget = campaign.budget || 0

    // Get safety limits
    const limits = await getSafetyLimits()

    // Validate against safety limits
    const validation = validateBudgetChange(currentBudget, newBudget, limits)
    if (!validation.valid) {
      // Log failed action
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'budget_change',
        entityType: 'campaign',
        entityId: campaignId,
        entityName: campaign.name,
        beforeState: { budget: currentBudget },
        afterState: { budget: newBudget },
        reason,
        success: false,
        errorMsg: validation.error,
      })

      return apiError('SAFETY_LIMIT', validation.error || 'Safety limit violated', 400)
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Push change to Amazon API first
    const amazonResult = await updateCampaignBudget(
      apiOpts,
      campaignId,
      campaign.type as CampaignType,
      newBudget
    )
    if (!amazonResult.success) {
      // Log failed Amazon API call
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'budget_change',
        entityType: 'campaign',
        entityId: campaignId,
        entityName: campaign.name,
        beforeState: { budget: currentBudget },
        afterState: { budget: newBudget },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })

      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
    }

    // Update budget in local database with lastPushedAt timestamp
    let updatedCampaign
    try {
      updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          budget: newBudget,
          lastPushedAt: new Date(), // Track successful Amazon push
        },
      })
    } catch (dbError) {
      // Critical: Amazon updated but local DB failed
      console.error('CRITICAL: Amazon updated but local DB failed:', {
        campaignId,
        newBudget,
        error: dbError,
      })
      // Still return success since Amazon has the correct value
      return apiResponse({
        campaignId,
        campaignName: campaign.name,
        previousBudget: currentBudget,
        newBudget,
        pushedToAmazon: true,
        warning: 'Amazon updated successfully but local cache update failed. Will reconcile on next sync.',
      })
    }

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'budget_change',
      entityType: 'campaign',
      entityId: campaignId,
      entityName: campaign.name,
      beforeState: { budget: currentBudget },
      afterState: { budget: newBudget },
      reason,
      success: true,
    })

    return apiResponse({
      campaignId,
      campaignName: campaign.name,
      previousBudget: currentBudget,
      newBudget: updatedCampaign.budget,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error changing budget:', error)
    return apiError('BUDGET_ERROR', 'Failed to change budget', 500)
  }
}
