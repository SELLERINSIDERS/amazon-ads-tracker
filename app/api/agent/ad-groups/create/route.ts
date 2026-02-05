import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { createSPAdGroup, createSBAdGroup, createSDAdGroup } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { campaignId, name, defaultBid, bid, bidOptimization, reason } = body as {
      campaignId: string
      name: string
      defaultBid?: number
      bid?: number         // SB uses 'bid' instead of 'defaultBid'
      bidOptimization?: 'clicks' | 'conversions' | 'reach'  // SD only
      reason?: string
    }

    // Validate required fields
    if (!campaignId || !name) {
      return apiError('INVALID_INPUT', 'campaignId and name are required', 400)
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404)
    }

    const campaignType = campaign.type as CampaignType

    // Validate bid based on campaign type
    if (campaignType === 'SP' || campaignType === 'SD') {
      if (defaultBid === undefined) {
        return apiError('INVALID_INPUT', 'defaultBid is required for SP and SD ad groups', 400)
      }
      if (typeof defaultBid !== 'number' || defaultBid < 0.02) {
        return apiError('INVALID_INPUT', 'defaultBid must be a positive number (minimum $0.02)', 400)
      }
    }
    // SB bid is optional

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Create in Amazon first (route based on campaign type)
    let amazonResult: { success: boolean; error?: string; adGroupId?: string }

    if (campaignType === 'SP') {
      amazonResult = await createSPAdGroup(apiOpts, {
        campaignId,
        name,
        defaultBid: defaultBid!,
      })
    } else if (campaignType === 'SB') {
      amazonResult = await createSBAdGroup(apiOpts, {
        campaignId,
        name,
        bid: bid || defaultBid,
      })
    } else {
      amazonResult = await createSDAdGroup(apiOpts, {
        campaignId,
        name,
        defaultBid: defaultBid!,
        bidOptimization,
      })
    }

    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'ad_group_create',
        entityType: 'ad_group',
        entityId: '',
        entityName: name,
        afterState: {
          campaignId,
          name,
          defaultBid: defaultBid || bid,
          campaignType,
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to create ad group in Amazon', 500)
    }

    const adGroupId = amazonResult.adGroupId
    if (!adGroupId) {
      return apiError('AMAZON_API_ERROR', 'No ad group ID returned from Amazon', 500)
    }

    // Create in local database
    const adGroup = await prisma.adGroup.create({
      data: {
        id: String(adGroupId),
        campaignId,
        name,
        state: 'enabled',
        defaultBid: defaultBid || bid || null,
      },
    })

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'ad_group_create',
      entityType: 'ad_group',
      entityId: adGroup.id,
      entityName: name,
      afterState: {
        campaignId,
        campaignName: campaign.name,
        campaignType,
        name,
        defaultBid: adGroup.defaultBid,
        state: 'enabled',
      },
      reason,
      success: true,
    })

    return apiResponse({
      adGroupId: adGroup.id,
      campaignId: adGroup.campaignId,
      campaignName: campaign.name,
      campaignType,
      name: adGroup.name,
      defaultBid: adGroup.defaultBid,
      state: adGroup.state,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error creating ad group:', error)
    return apiError('CREATE_ERROR', 'Failed to create ad group', 500)
  }
}
