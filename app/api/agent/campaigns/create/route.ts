import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { createSPCampaign, createSBCampaign, createSDCampaign } from '@/lib/amazon-api-updates'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import type { CampaignType } from '@/lib/types/amazon-api'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const {
      name,
      budget,
      type = 'SP',
      targetingType,
      startDate,
      endDate,
      dynamicBidding,
      brandEntityId,
      tactic,
      costType,
      reason
    } = body as {
      name: string
      budget: number
      type?: CampaignType
      targetingType?: 'MANUAL' | 'AUTO'
      startDate?: string
      endDate?: string
      dynamicBidding?: { strategy: 'LEGACY_FOR_SALES' | 'AUTO_FOR_SALES' | 'MANUAL' }
      brandEntityId?: string
      tactic?: 'T00020' | 'T00030'
      costType?: 'cpc' | 'vcpm'
      reason?: string
    }

    // Validate required fields
    if (!name || budget === undefined) {
      return apiError('INVALID_INPUT', 'name and budget are required', 400)
    }

    if (typeof budget !== 'number' || budget < 1) {
      return apiError('INVALID_INPUT', 'budget must be a positive number (minimum $1)', 400)
    }

    if (!['SP', 'SB', 'SD'].includes(type)) {
      return apiError('INVALID_INPUT', 'type must be SP, SB, or SD', 400)
    }

    // Type-specific validation
    if (type === 'SP') {
      if (!targetingType || !['MANUAL', 'AUTO'].includes(targetingType)) {
        return apiError('INVALID_INPUT', 'targetingType (MANUAL or AUTO) is required for SP campaigns', 400)
      }
    } else if (type === 'SB') {
      if (!brandEntityId) {
        return apiError('INVALID_INPUT', 'brandEntityId is required for SB campaigns', 400)
      }
    } else if (type === 'SD') {
      if (!tactic || !['T00020', 'T00030'].includes(tactic)) {
        return apiError('INVALID_INPUT', 'tactic (T00020 for product targeting or T00030 for audience) is required for SD campaigns', 400)
      }
    }

    // Get connection status for profile ID
    const connection = await getConnectionStatus()
    if (!connection.profileId) {
      return apiError('NO_PROFILE', 'No Amazon profile selected', 400)
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Default start date to today if not provided
    const today = new Date()
    const defaultStartDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`
    const effectiveStartDate = startDate || defaultStartDate

    // Create in Amazon first (route based on type)
    let amazonResult: { success: boolean; error?: string; campaignId?: string }

    if (type === 'SP') {
      amazonResult = await createSPCampaign(apiOpts, {
        name,
        budget,
        targetingType: targetingType!,
        startDate: effectiveStartDate,
        endDate,
        dynamicBidding,
      })
    } else if (type === 'SB') {
      amazonResult = await createSBCampaign(apiOpts, {
        name,
        budget,
        brandEntityId: brandEntityId!,
        startDate: effectiveStartDate,
        endDate,
      })
    } else {
      amazonResult = await createSDCampaign(apiOpts, {
        name,
        budget,
        tactic: tactic!,
        costType,
        startDate: effectiveStartDate,
        endDate,
      })
    }

    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'campaign_create',
        entityType: 'campaign',
        entityId: '',
        entityName: name,
        afterState: {
          name,
          budget,
          type,
          ...(type === 'SP' && { targetingType }),
          ...(type === 'SB' && { brandEntityId }),
          ...(type === 'SD' && { tactic, costType }),
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to create campaign in Amazon', 500)
    }

    const campaignId = amazonResult.campaignId
    if (!campaignId) {
      return apiError('AMAZON_API_ERROR', 'No campaign ID returned from Amazon', 500)
    }

    // Create in local database
    const campaign = await prisma.campaign.create({
      data: {
        id: String(campaignId),
        profileId: connection.profileId,
        type,
        name,
        state: 'enabled',
        budget,
        budgetType: 'daily',
        startDate: effectiveStartDate,
        endDate: endDate || null,
        brandEntityId: type === 'SB' ? brandEntityId : null,
        tactic: type === 'SD' ? tactic : null,
        costType: type === 'SD' ? (costType || 'cpc') : null,
        syncedAt: new Date(),
      },
    })

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'campaign_create',
      entityType: 'campaign',
      entityId: campaign.id,
      entityName: name,
      afterState: {
        name,
        budget,
        type,
        state: 'enabled',
        ...(type === 'SP' && { targetingType }),
        ...(type === 'SB' && { brandEntityId }),
        ...(type === 'SD' && { tactic, costType: campaign.costType }),
      },
      reason,
      success: true,
    })

    return apiResponse({
      campaignId: campaign.id,
      name: campaign.name,
      type: campaign.type,
      budget: campaign.budget,
      state: campaign.state,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      ...(type === 'SP' && { targetingType }),
      ...(type === 'SB' && { brandEntityId: campaign.brandEntityId }),
      ...(type === 'SD' && { tactic: campaign.tactic, costType: campaign.costType }),
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return apiError('CREATE_ERROR', 'Failed to create campaign', 500)
  }
}
