import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { getSafetyLimits, validateBidChange } from '@/lib/safety'
import { logAction } from '@/lib/audit'

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

    // Get keyword
    const keyword = await prisma.keyword.findUnique({
      where: { id: keywordId },
      include: { adGroup: { include: { campaign: true } } },
    })

    if (!keyword) {
      return apiError('NOT_FOUND', 'Keyword not found', 404)
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

    // Update bid in database
    const updatedKeyword = await prisma.keyword.update({
      where: { id: keywordId },
      data: { bid: newBid },
    })

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
    })
  } catch (error) {
    console.error('Error changing bid:', error)
    return apiError('BID_ERROR', 'Failed to change bid', 500)
  }
}
