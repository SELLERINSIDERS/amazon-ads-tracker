import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import {
  updateCampaignState,
  updateAdGroupState,
  updateSPKeywordState,
} from '@/lib/amazon-api-updates'
import type { CampaignType, EntityState } from '@/lib/types/amazon-api'

const VALID_ENTITY_TYPES = ['campaign', 'keyword', 'ad_group'] as const
const VALID_STATUSES = ['enabled', 'paused'] as const

type EntityType = (typeof VALID_ENTITY_TYPES)[number]
type Status = (typeof VALID_STATUSES)[number]

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { entityType, entityId, status, reason } = body as {
      entityType: string
      entityId: string
      status: string
      reason?: string
    }

    // Validate input
    if (!entityType || !entityId || !status) {
      return apiError('INVALID_INPUT', 'entityType, entityId, and status are required', 400)
    }

    if (!VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
      return apiError(
        'INVALID_INPUT',
        `entityType must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
        400
      )
    }

    if (!VALID_STATUSES.includes(status as Status)) {
      return apiError(
        'INVALID_INPUT',
        `status must be one of: ${VALID_STATUSES.join(', ')}`,
        400
      )
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    let entity: { id: string; name: string; state: string } | null = null
    let previousState: string
    let campaignType: CampaignType

    // Get and update entity based on type
    switch (entityType as EntityType) {
      case 'campaign': {
        const campaign = await prisma.campaign.findUnique({
          where: { id: entityId },
        })
        if (!campaign) {
          return apiError('NOT_FOUND', 'Campaign not found', 404)
        }
        previousState = campaign.state
        campaignType = campaign.type as CampaignType

        // Push to Amazon API first
        const amazonResult = await updateCampaignState(
          apiOpts,
          entityId,
          campaignType,
          status as EntityState
        )
        if (!amazonResult.success) {
          await logAction({
            actorType: 'agent',
            actorId: authResult.context.apiKey.id,
            actionType: 'status_change',
            entityType: 'campaign',
            entityId,
            entityName: campaign.name,
            beforeState: { state: previousState },
            afterState: { state: status },
            reason,
            success: false,
            errorMsg: amazonResult.error,
          })
          return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
        }

        const updated = await prisma.campaign.update({
          where: { id: entityId },
          data: { state: status },
        })
        entity = { id: updated.id, name: updated.name, state: updated.state }
        break
      }

      case 'keyword': {
        const keyword = await prisma.keyword.findUnique({
          where: { id: entityId },
          include: { adGroup: { include: { campaign: true } } },
        })
        if (!keyword) {
          return apiError('NOT_FOUND', 'Keyword not found', 404)
        }
        previousState = keyword.state
        campaignType = keyword.adGroup.campaign.type as CampaignType

        // Only SP keywords support status changes via this API
        if (campaignType !== 'SP') {
          return apiError('INVALID_INPUT', 'Only Sponsored Products keywords support status changes', 400)
        }

        // Push to Amazon API first
        const amazonResult = await updateSPKeywordState(apiOpts, entityId, status as EntityState)
        if (!amazonResult.success) {
          await logAction({
            actorType: 'agent',
            actorId: authResult.context.apiKey.id,
            actionType: 'status_change',
            entityType: 'keyword',
            entityId,
            entityName: keyword.keywordText,
            beforeState: { state: previousState },
            afterState: { state: status },
            reason,
            success: false,
            errorMsg: amazonResult.error,
          })
          return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
        }

        const updated = await prisma.keyword.update({
          where: { id: entityId },
          data: { state: status },
        })
        entity = { id: updated.id, name: updated.keywordText, state: updated.state }
        break
      }

      case 'ad_group': {
        const adGroup = await prisma.adGroup.findUnique({
          where: { id: entityId },
          include: { campaign: true },
        })
        if (!adGroup) {
          return apiError('NOT_FOUND', 'Ad group not found', 404)
        }
        previousState = adGroup.state
        campaignType = adGroup.campaign.type as CampaignType

        // Push to Amazon API first
        const amazonResult = await updateAdGroupState(
          apiOpts,
          entityId,
          campaignType,
          status as EntityState
        )
        if (!amazonResult.success) {
          await logAction({
            actorType: 'agent',
            actorId: authResult.context.apiKey.id,
            actionType: 'status_change',
            entityType: 'ad_group',
            entityId,
            entityName: adGroup.name,
            beforeState: { state: previousState },
            afterState: { state: status },
            reason,
            success: false,
            errorMsg: amazonResult.error,
          })
          return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
        }

        const updated = await prisma.adGroup.update({
          where: { id: entityId },
          data: { state: status },
        })
        entity = { id: updated.id, name: updated.name, state: updated.state }
        break
      }

      default:
        return apiError('INVALID_INPUT', 'Invalid entity type', 400)
    }

    // Log the action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'status_change',
      entityType: entityType as EntityType,
      entityId,
      entityName: entity.name,
      beforeState: { state: previousState },
      afterState: { state: status },
      reason,
      success: true,
    })

    return apiResponse({
      entityType,
      entityId,
      entityName: entity.name,
      previousStatus: previousState,
      newStatus: entity.state,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error changing status:', error)
    return apiError('STATUS_ERROR', 'Failed to change status', 500)
  }
}
