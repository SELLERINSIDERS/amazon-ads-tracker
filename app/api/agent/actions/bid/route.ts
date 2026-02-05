import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { getSafetyLimits, validateBidChange } from '@/lib/safety'
import { logAction } from '@/lib/audit'
import { getAmazonApiOptions } from '@/lib/amazon-credentials'
import { updateKeywordBid } from '@/lib/amazon-api-updates'
import type { CampaignType } from '@/lib/types/amazon-api'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { keywordId, newBid, reason } = body

    if (!keywordId || newBid === undefined) {
      return apiError('INVALID_INPUT', 'keywordId and newBid are required', 400)
    }

    if (typeof newBid !== 'number' || newBid < 0) {
      return apiError('INVALID_INPUT', 'newBid must be a positive number', 400)
    }

    // Get keyword with campaign info
    const keyword = await prisma.keyword.findUnique({
      where: { id: keywordId },
      include: { adGroup: { include: { campaign: true } } },
    })

    if (!keyword) {
      return apiError('NOT_FOUND', 'Keyword not found', 404)
    }

    const campaignType = keyword.adGroup.campaign.type as CampaignType

    // SP and SB keywords support bid changes, SD does not have keywords
    if (campaignType !== 'SP' && campaignType !== 'SB') {
      return apiError('INVALID_INPUT', 'Only Sponsored Products and Sponsored Brands keywords support bid changes', 400)
    }

    const currentBid = keyword.bid || 0

    // Get safety limits
    const limits = await getSafetyLimits()

    // Validate against safety limits
    const validation = validateBidChange(currentBid, newBid, limits)
    if (!validation.valid) {
      // Log failed action
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'bid_change',
        entityType: 'keyword',
        entityId: keywordId,
        entityName: keyword.keywordText,
        beforeState: { bid: currentBid },
        afterState: { bid: newBid },
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

    // Push change to Amazon API first (routes to SP or SB based on campaign type)
    const amazonResult = await updateKeywordBid(apiOpts, keywordId, campaignType, newBid)
    if (!amazonResult.success) {
      // Log failed Amazon API call
      await logAction({
        actorType: 'agent',
        actorId: authResult.context.apiKey.id,
        actionType: 'bid_change',
        entityType: 'keyword',
        entityId: keywordId,
        entityName: keyword.keywordText,
        beforeState: { bid: currentBid },
        afterState: { bid: newBid },
        reason,
        success: false,
        errorMsg: amazonResult.error,
      })

      return apiError('AMAZON_API_ERROR', amazonResult.error || 'Failed to update Amazon', 500)
    }

    // Update bid in local database with lastPushedAt timestamp
    let updatedKeyword
    try {
      updatedKeyword = await prisma.keyword.update({
        where: { id: keywordId },
        data: {
          bid: newBid,
          lastPushedAt: new Date(), // Track successful Amazon push
        },
      })
    } catch (dbError) {
      // Critical: Amazon updated but local DB failed
      // Log for manual reconciliation - next sync will fix it
      console.error('CRITICAL: Amazon updated but local DB failed:', {
        keywordId,
        newBid,
        error: dbError,
      })
      // Still return success since Amazon has the correct value
      // Next sync will reconcile the local DB
      return apiResponse({
        keywordId,
        keywordText: keyword.keywordText,
        previousBid: currentBid,
        newBid,
        campaignName: keyword.adGroup.campaign.name,
        pushedToAmazon: true,
        warning: 'Amazon updated successfully but local cache update failed. Will reconcile on next sync.',
      })
    }

    // Log successful action
    await logAction({
      actorType: 'agent',
      actorId: authResult.context.apiKey.id,
      actionType: 'bid_change',
      entityType: 'keyword',
      entityId: keywordId,
      entityName: keyword.keywordText,
      beforeState: { bid: currentBid },
      afterState: { bid: newBid },
      reason,
      success: true,
    })

    return apiResponse({
      keywordId,
      keywordText: keyword.keywordText,
      previousBid: currentBid,
      newBid: updatedKeyword.bid,
      campaignName: keyword.adGroup.campaign.name,
      pushedToAmazon: true,
    })
  } catch (error) {
    console.error('Error changing bid:', error)
    return apiError('BID_ERROR', 'Failed to change bid', 500)
  }
}
