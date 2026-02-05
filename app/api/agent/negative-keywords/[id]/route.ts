import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { deleteNegativeKeyword, deleteSBNegativeKeyword } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE - Delete/archive a negative keyword
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
    // Get the negative keyword
    const negativeKeyword = await prisma.negativeKeyword.findUnique({
      where: { id },
      include: {
        campaign: { select: { name: true, type: true } },
        adGroup: { select: { name: true } },
      },
    })

    if (!negativeKeyword) {
      return apiError('NOT_FOUND', 'Negative keyword not found', 404)
    }

    const campaignType = negativeKeyword.campaign.type as CampaignType

    // SP and SB campaigns support negative keyword deletion, SD does not have negative keywords
    if (campaignType !== 'SP' && campaignType !== 'SB') {
      return apiError('INVALID_INPUT', 'Only Sponsored Products and Sponsored Brands negative keywords can be deleted', 400)
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Determine if it's campaign-level or ad-group-level
    const isCampaignLevel = !negativeKeyword.adGroupId

    // Delete from Amazon first (archives it) - route to SP or SB based on campaign type
    const amazonResult = campaignType === 'SP'
      ? await deleteNegativeKeyword(apiOpts, id, isCampaignLevel)
      : await deleteSBNegativeKeyword(apiOpts, id, isCampaignLevel)
    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'keyword_remove',
        entityType: 'keyword',
        entityId: id,
        entityName: negativeKeyword.keywordText,
        beforeState: {
          campaignId: negativeKeyword.campaignId,
          adGroupId: negativeKeyword.adGroupId,
          matchType: negativeKeyword.matchType,
          state: negativeKeyword.state,
          isNegative: true,
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to delete from Amazon', 500)
    }

    // Update state to archived in local database
    await prisma.negativeKeyword.update({
      where: { id },
      data: { state: 'archived' },
    })

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'keyword_remove',
      entityType: 'keyword',
      entityId: id,
      entityName: negativeKeyword.keywordText,
      beforeState: {
        campaignId: negativeKeyword.campaignId,
        adGroupId: negativeKeyword.adGroupId,
        matchType: negativeKeyword.matchType,
        state: negativeKeyword.state,
        isNegative: true,
      },
      afterState: {
        state: 'archived',
        isNegative: true,
      },
      reason,
      success: true,
    })

    return apiResponse({
      id,
      keywordText: negativeKeyword.keywordText,
      deleted: true,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error deleting negative keyword:', error)
    return apiError('DELETE_ERROR', 'Failed to delete negative keyword', 500)
  }
}
