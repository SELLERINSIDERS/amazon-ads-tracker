import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { createSPKeywords, createSBKeywords } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

interface KeywordInput {
  keywordText: string
  matchType: 'EXACT' | 'PHRASE' | 'BROAD'
  bid?: number
}

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { adGroupId, keywords, reason } = body as {
      adGroupId: string
      keywords: KeywordInput[]
      reason?: string
    }

    // Validate required fields
    if (!adGroupId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return apiError('INVALID_INPUT', 'adGroupId and keywords array are required', 400)
    }

    // Validate each keyword
    const validMatchTypes = ['EXACT', 'PHRASE', 'BROAD']
    for (const kw of keywords) {
      if (!kw.keywordText) {
        return apiError('INVALID_INPUT', 'Each keyword must have keywordText', 400)
      }
      if (!kw.matchType || !validMatchTypes.includes(kw.matchType)) {
        return apiError('INVALID_INPUT', 'Each keyword matchType must be EXACT, PHRASE, or BROAD', 400)
      }
      if (kw.bid !== undefined && (typeof kw.bid !== 'number' || kw.bid < 0.02)) {
        return apiError('INVALID_INPUT', 'Keyword bid must be at least $0.02', 400)
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

    // SP and SB support keywords, SD does not
    if (campaignType !== 'SP' && campaignType !== 'SB') {
      return apiError('INVALID_INPUT', 'Only Sponsored Products and Sponsored Brands ad groups support keyword creation', 400)
    }

    // Get Amazon API credentials
    const apiOpts = await getAmazonApiOptions()
    if (!apiOpts) {
      return apiError('NOT_CONFIGURED', 'Amazon API not configured', 500)
    }

    // Create in Amazon first
    const keywordsWithCampaign = keywords.map((kw) => ({
      campaignId: adGroup.campaignId,
      adGroupId,
      keywordText: kw.keywordText,
      matchType: kw.matchType,
      bid: kw.bid,
    }))

    // Route to SP or SB based on campaign type
    const amazonResult = campaignType === 'SP'
      ? await createSPKeywords(apiOpts, keywordsWithCampaign)
      : await createSBKeywords(apiOpts, keywordsWithCampaign)

    if (!amazonResult.success) {
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'keyword_add',
        entityType: 'keyword',
        entityId: '',
        entityName: keywords.map((k) => k.keywordText).join(', '),
        afterState: {
          adGroupId,
          keywords: keywords.map((k) => ({
            keywordText: k.keywordText,
            matchType: k.matchType,
            bid: k.bid,
          })),
        },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })
      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to create keywords in Amazon', 500)
    }

    const keywordIds = amazonResult.keywordIds || []
    if (keywordIds.length === 0) {
      return apiError('AMAZON_API_ERROR', 'No keyword IDs returned from Amazon', 500)
    }

    // Create in local database
    const createdKeywords = await Promise.all(
      keywordIds.map((keywordId, index) =>
        prisma.keyword.create({
          data: {
            id: String(keywordId),
            adGroupId,
            keywordText: keywords[index].keywordText,
            matchType: keywords[index].matchType.toLowerCase(),
            state: 'enabled',
            bid: keywords[index].bid || null,
            campaignType,
          },
        })
      )
    )

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'keyword_add',
      entityType: 'keyword',
      entityId: keywordIds.join(','),
      entityName: keywords.map((k) => k.keywordText).join(', '),
      afterState: {
        adGroupId,
        adGroupName: adGroup.name,
        campaignId: adGroup.campaignId,
        campaignName: adGroup.campaign.name,
        keywords: createdKeywords.map((k) => ({
          id: k.id,
          keywordText: k.keywordText,
          matchType: k.matchType,
          bid: k.bid,
          state: k.state,
        })),
      },
      reason,
      success: true,
    })

    return apiResponse({
      adGroupId,
      adGroupName: adGroup.name,
      campaignId: adGroup.campaignId,
      campaignName: adGroup.campaign.name,
      keywords: createdKeywords.map((k) => ({
        keywordId: k.id,
        keywordText: k.keywordText,
        matchType: k.matchType,
        bid: k.bid,
        state: k.state,
      })),
      count: createdKeywords.length,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error creating keywords:', error)
    return apiError('CREATE_ERROR', 'Failed to create keywords', 500)
  }
}
