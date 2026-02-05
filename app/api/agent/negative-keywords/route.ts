import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { createNegativeKeyword, createSBNegativeKeyword } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

// GET - List negative keywords
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
  const campaignId = searchParams.get('campaignId') || undefined
  const adGroupId = searchParams.get('adGroupId') || undefined

  try {
    const where: {
      campaign: { profileId: string }
      campaignId?: string
      adGroupId?: string | null
    } = {
      campaign: { profileId: connection.profileId },
    }

    if (campaignId) {
      where.campaignId = campaignId
    }

    if (adGroupId) {
      where.adGroupId = adGroupId
    }

    const negativeKeywords = await prisma.negativeKeyword.findMany({
      where,
      include: {
        campaign: { select: { name: true, type: true } },
        adGroup: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse({
      negativeKeywords: negativeKeywords.map((nk) => ({
        id: nk.id,
        campaignId: nk.campaignId,
        campaignName: nk.campaign.name,
        adGroupId: nk.adGroupId,
        adGroupName: nk.adGroup?.name || null,
        keywordText: nk.keywordText,
        matchType: nk.matchType,
        state: nk.state,
        level: nk.adGroupId ? 'ad_group' : 'campaign',
        createdAt: nk.createdAt,
      })),
      total: negativeKeywords.length,
    })
  } catch (error) {
    console.error('Error fetching negative keywords:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch negative keywords', 500)
  }
}

// POST - Create negative keyword
export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { campaignId, adGroupId, keywordText, matchType, reason } = body as {
      campaignId: string
      adGroupId?: string
      keywordText: string
      matchType: 'negativeExact' | 'negativePhrase'
      reason?: string
    }

    // Validate required fields
    if (!campaignId || !keywordText || !matchType) {
      return apiError('INVALID_INPUT', 'campaignId, keywordText, and matchType are required', 400)
    }

    // Validate matchType
    if (!['negativeExact', 'negativePhrase'].includes(matchType)) {
      return apiError('INVALID_INPUT', 'matchType must be negativeExact or negativePhrase', 400)
    }

    // Verify campaign exists and is SP or SB type (SD does not support negative keywords)
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return apiError('NOT_FOUND', 'Campaign not found', 404)
    }

    const campaignType = campaign.type as CampaignType

    if (campaignType !== 'SP' && campaignType !== 'SB') {
      return apiError('INVALID_INPUT', 'Only Sponsored Products and Sponsored Brands campaigns support negative keywords', 400)
    }

    // Verify ad group exists if provided
    if (adGroupId) {
      const adGroup = await prisma.adGroup.findUnique({
        where: { id: adGroupId },
      })
      if (!adGroup) {
        return apiError('NOT_FOUND', 'Ad group not found', 404)
      }
      if (adGroup.campaignId !== campaignId) {
        return apiError('INVALID_INPUT', 'Ad group does not belong to the specified campaign', 400)
      }
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Create in Amazon first (route to SP or SB based on campaign type)
    const amazonResult = campaignType === 'SP'
      ? await createNegativeKeyword(apiOpts, {
          campaignId,
          adGroupId,
          keywordText,
          matchType,
        })
      : await createSBNegativeKeyword(apiOpts, {
          campaignId,
          adGroupId,
          keywordText,
          matchType,
        })

    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'keyword_add',
        entityType: 'keyword',
        entityId: '',
        entityName: keywordText,
        afterState: { campaignId, adGroupId, matchType, isNegative: true },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to create in Amazon', 500)
    }

    const keywordId = amazonResult.keywordId

    if (!keywordId) {
      return apiError('AMAZON_API_ERROR', 'No keyword ID returned from Amazon', 500)
    }

    // Create in local database
    const negativeKeyword = await prisma.negativeKeyword.create({
      data: {
        id: String(keywordId),
        campaignId,
        adGroupId: adGroupId || null,
        keywordText,
        matchType,
        state: 'enabled',
        campaignType,
      },
      include: {
        campaign: { select: { name: true } },
        adGroup: { select: { name: true } },
      },
    })

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'keyword_add',
      entityType: 'keyword',
      entityId: negativeKeyword.id,
      entityName: keywordText,
      afterState: {
        campaignId,
        adGroupId,
        matchType,
        isNegative: true,
      },
      reason,
      success: true,
    })

    return apiResponse({
      id: negativeKeyword.id,
      campaignId: negativeKeyword.campaignId,
      campaignName: negativeKeyword.campaign.name,
      adGroupId: negativeKeyword.adGroupId,
      adGroupName: negativeKeyword.adGroup?.name || null,
      keywordText: negativeKeyword.keywordText,
      matchType: negativeKeyword.matchType,
      state: negativeKeyword.state,
      level: negativeKeyword.adGroupId ? 'ad_group' : 'campaign',
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error creating negative keyword:', error)
    return apiError('CREATE_ERROR', 'Failed to create negative keyword', 500)
  }
}
