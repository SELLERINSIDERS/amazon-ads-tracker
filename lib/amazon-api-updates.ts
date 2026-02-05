/**
 * Amazon Advertising API update functions for pushing changes to Amazon
 */

import { withRateLimit } from './rate-limiter'
import { getClientId, AMAZON_API_ENDPOINTS, type AmazonRegion } from './amazon'
import type { CampaignType, EntityState } from './types/amazon-api'

const DEFAULT_REGION: AmazonRegion = 'NA'

interface FetchOptions {
  accessToken: string
  profileId: string
  region?: AmazonRegion
}

function getHeaders(accessToken: string, profileId: string, contentType: string): HeadersInit {
  return {
    'Amazon-Advertising-API-ClientId': getClientId(),
    'Amazon-Advertising-API-Scope': profileId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': contentType,
    Accept: contentType,
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 * Amazon recommends: 1s, 4s, 10s, 30s pattern with jitter
 */
function calculateRetryDelay(attempt: number): number {
  const baseDelays = [1000, 4000, 10000, 30000] // Amazon recommended pattern
  const baseDelay = baseDelays[Math.min(attempt, baseDelays.length - 1)]
  // Add random jitter (0-50% of base delay) to prevent thundering herd
  const jitter = Math.random() * baseDelay * 0.5
  return baseDelay + jitter
}

/**
 * Check if error is retryable (429 rate limit, or 5xx server errors)
 */
function isRetryableError(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 4
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await withRateLimit(() => fetch(url, options))

      // If retryable error, wait and retry
      if (isRetryableError(response.status)) {
        const delay = calculateRetryDelay(attempt)
        console.warn(`[Amazon API] Retryable error ${response.status}, attempt ${attempt + 1}/${retries}, waiting ${Math.round(delay)}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      // Network errors - also retry
      lastError = error instanceof Error ? error : new Error(String(error))
      console.warn(`[Amazon API] Network error, attempt ${attempt + 1}/${retries}:`, lastError.message)
      const delay = calculateRetryDelay(attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

interface ApiResult {
  success: boolean
  error?: string
  data?: unknown
}

// ============= SP Keyword Updates =============

export async function updateSPKeywordBid(
  opts: FetchOptions,
  keywordId: string,
  newBid: number
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: [
      {
        keywordId: keywordId,
        bid: newBid,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sp/keywords`, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, 'application/vnd.spKeyword.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('SP keyword update error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  // Check for per-item errors in response
  const result = data.keywords?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= SP Keyword State Updates =============

export async function updateSPKeywordState(
  opts: FetchOptions,
  keywordId: string,
  newState: EntityState
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: [
      {
        keywordId: keywordId,
        state: newState.toUpperCase(),
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sp/keywords`, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, 'application/vnd.spKeyword.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('SP keyword state update error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.keywords?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= Campaign Budget Updates =============

export async function updateCampaignBudget(
  opts: FetchOptions,
  campaignId: string,
  campaignType: CampaignType,
  newBudget: number
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/campaigns`,
      contentType: 'application/vnd.spCampaign.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/v4/campaigns`,
      contentType: 'application/vnd.sbcampaignresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/campaigns`,
      contentType: 'application/vnd.sdcampaign.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  // Body format differs by campaign type
  let body: unknown
  if (campaignType === 'SP') {
    body = {
      campaigns: [
        {
          campaignId: campaignId,
          budget: {
            budget: newBudget,
            budgetType: 'DAILY',
          },
        },
      ],
    }
  } else {
    // SB and SD use flat budget
    body = {
      campaigns: [
        {
          campaignId: campaignId,
          budget: newBudget,
        },
      ],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${campaignType} campaign budget update error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.campaigns?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= Campaign State Updates =============

export async function updateCampaignState(
  opts: FetchOptions,
  campaignId: string,
  campaignType: CampaignType,
  newState: EntityState
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/campaigns`,
      contentType: 'application/vnd.spCampaign.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/v4/campaigns`,
      contentType: 'application/vnd.sbcampaignresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/campaigns`,
      contentType: 'application/vnd.sdcampaign.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  const body = {
    campaigns: [
      {
        campaignId: campaignId,
        state: newState.toUpperCase(),
      },
    ],
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${campaignType} campaign state update error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.campaigns?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= Ad Group State Updates =============

export async function updateAdGroupState(
  opts: FetchOptions,
  adGroupId: string,
  campaignType: CampaignType,
  newState: EntityState
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/adGroups`,
      contentType: 'application/vnd.spAdGroup.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/v4/adGroups`,
      contentType: 'application/vnd.sbadgroupresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/adGroups`,
      contentType: 'application/vnd.sdadgroup.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  const body = {
    adGroups: [
      {
        adGroupId: adGroupId,
        state: newState.toUpperCase(),
      },
    ],
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${campaignType} ad group state update error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.adGroups?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= Negative Keywords =============

export interface CreateNegativeKeywordInput {
  campaignId: string
  adGroupId?: string // Optional for campaign-level negatives
  keywordText: string
  matchType: 'negativeExact' | 'negativePhrase'
}

export async function createNegativeKeyword(
  opts: FetchOptions,
  input: CreateNegativeKeywordInput
): Promise<ApiResult & { keywordId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  // Use campaign-level or ad-group-level endpoint
  const isCampaignLevel = !input.adGroupId
  const url = isCampaignLevel
    ? `${baseUrl}/sp/campaignNegativeKeywords`
    : `${baseUrl}/sp/negativeKeywords`

  const contentType = isCampaignLevel
    ? 'application/vnd.spCampaignNegativeKeyword.v3+json'
    : 'application/vnd.spNegativeKeyword.v3+json'

  let body: unknown
  if (isCampaignLevel) {
    body = {
      campaignNegativeKeywords: [
        {
          campaignId: input.campaignId,
          keywordText: input.keywordText,
          matchType: input.matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
          state: 'ENABLED',
        },
      ],
    }
  } else {
    body = {
      negativeKeywords: [
        {
          campaignId: input.campaignId,
          adGroupId: input.adGroupId,
          keywordText: input.keywordText,
          matchType: input.matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
          state: 'ENABLED',
        },
      ],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create negative keyword error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const items = isCampaignLevel ? data.campaignNegativeKeywords : data.negativeKeywords
  const result = items?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return {
    success: true,
    data,
    keywordId: result?.keywordId || result?.campaignNegativeKeywordId,
  }
}

export async function deleteNegativeKeyword(
  opts: FetchOptions,
  keywordId: string,
  isCampaignLevel: boolean
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const url = isCampaignLevel
    ? `${baseUrl}/sp/campaignNegativeKeywords`
    : `${baseUrl}/sp/negativeKeywords`

  const contentType = isCampaignLevel
    ? 'application/vnd.spCampaignNegativeKeyword.v3+json'
    : 'application/vnd.spNegativeKeyword.v3+json'

  // Amazon API uses archive state to delete
  let body: unknown
  if (isCampaignLevel) {
    body = {
      campaignNegativeKeywords: [
        {
          campaignNegativeKeywordId: keywordId,
          state: 'ARCHIVED',
        },
      ],
    }
  } else {
    body = {
      negativeKeywords: [
        {
          keywordId: keywordId,
          state: 'ARCHIVED',
        },
      ],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Delete negative keyword error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  return { success: true, data }
}

// ============= Create Operations =============

export interface CreateSPCampaignInput {
  name: string
  budget: number
  targetingType: 'MANUAL' | 'AUTO'
  startDate: string // YYYYMMDD format
  endDate?: string
  dynamicBidding?: {
    strategy: 'LEGACY_FOR_SALES' | 'AUTO_FOR_SALES' | 'MANUAL'
  }
}

export async function createSPCampaign(
  opts: FetchOptions,
  input: CreateSPCampaignInput
): Promise<ApiResult & { campaignId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    campaigns: [
      {
        name: input.name,
        state: 'ENABLED',
        budget: {
          budget: input.budget,
          budgetType: 'DAILY',
        },
        targetingType: input.targetingType,
        startDate: input.startDate,
        endDate: input.endDate,
        dynamicBidding: input.dynamicBidding || { strategy: 'LEGACY_FOR_SALES' },
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sp/campaigns`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.spCampaign.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SP campaign error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.campaigns?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, campaignId: result?.campaignId }
}

export interface CreateSPAdGroupInput {
  campaignId: string
  name: string
  defaultBid: number
}

export async function createSPAdGroup(
  opts: FetchOptions,
  input: CreateSPAdGroupInput
): Promise<ApiResult & { adGroupId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    adGroups: [
      {
        campaignId: input.campaignId,
        name: input.name,
        state: 'ENABLED',
        defaultBid: input.defaultBid,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sp/adGroups`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.spAdGroup.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SP ad group error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.adGroups?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, adGroupId: result?.adGroupId }
}

export interface CreateSPKeywordInput {
  adGroupId: string
  campaignId: string
  keywordText: string
  matchType: 'EXACT' | 'PHRASE' | 'BROAD'
  bid?: number
}

export async function createSPKeywords(
  opts: FetchOptions,
  keywords: CreateSPKeywordInput[]
): Promise<ApiResult & { keywordIds?: string[] }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: keywords.map((kw) => ({
      campaignId: kw.campaignId,
      adGroupId: kw.adGroupId,
      keywordText: kw.keywordText,
      matchType: kw.matchType,
      state: 'ENABLED',
      bid: kw.bid,
    })),
  }

  const response = await fetchWithRetry(`${baseUrl}/sp/keywords`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.spKeyword.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SP keywords error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  // Check for any errors in the response
  const results = data.keywords || []
  const errors = results.filter((r: { code?: string }) => r.code && r.code !== 'SUCCESS')
  if (errors.length > 0) {
    return {
      success: false,
      error: errors.map((e: { details?: string; code?: string }) => e.details || e.code).join(', ')
    }
  }

  return {
    success: true,
    data,
    keywordIds: results.map((r: { keywordId?: string }) => r.keywordId).filter(Boolean),
  }
}

// ============= SB Keyword Operations =============

export interface CreateSBKeywordInput {
  adGroupId: string
  campaignId: string
  keywordText: string
  matchType: 'EXACT' | 'PHRASE' | 'BROAD'
  bid?: number
}

export async function createSBKeywords(
  opts: FetchOptions,
  keywords: CreateSBKeywordInput[]
): Promise<ApiResult & { keywordIds?: string[] }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: keywords.map((kw) => ({
      campaignId: kw.campaignId,
      adGroupId: kw.adGroupId,
      keywordText: kw.keywordText,
      matchType: kw.matchType,
      state: 'ENABLED',
      bid: kw.bid,
    })),
  }

  const response = await fetchWithRetry(`${baseUrl}/sb/keywords`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sbkeywordresource.v4+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SB keywords error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const results = data.keywords || []
  const errors = results.filter((r: { code?: string }) => r.code && r.code !== 'SUCCESS')
  if (errors.length > 0) {
    return {
      success: false,
      error: errors.map((e: { details?: string; code?: string }) => e.details || e.code).join(', ')
    }
  }

  return {
    success: true,
    data,
    keywordIds: results.map((r: { keywordId?: string }) => r.keywordId).filter(Boolean),
  }
}

export async function updateSBKeywordBid(
  opts: FetchOptions,
  keywordId: string,
  newBid: number
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: [
      {
        keywordId: keywordId,
        bid: newBid,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sb/keywords`, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sbkeywordresource.v4+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('SB keyword update error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.keywords?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

export async function updateSBKeywordState(
  opts: FetchOptions,
  keywordId: string,
  newState: EntityState
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    keywords: [
      {
        keywordId: keywordId,
        state: newState.toUpperCase(),
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sb/keywords`, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sbkeywordresource.v4+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('SB keyword state update error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.keywords?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data }
}

// ============= Unified Keyword Routers =============

export async function updateKeywordBid(
  opts: FetchOptions,
  keywordId: string,
  campaignType: CampaignType,
  newBid: number
): Promise<ApiResult> {
  if (campaignType === 'SP') {
    return updateSPKeywordBid(opts, keywordId, newBid)
  } else if (campaignType === 'SB') {
    return updateSBKeywordBid(opts, keywordId, newBid)
  }
  return { success: false, error: `Campaign type ${campaignType} does not support keyword bid updates` }
}

export async function updateKeywordState(
  opts: FetchOptions,
  keywordId: string,
  campaignType: CampaignType,
  newState: EntityState
): Promise<ApiResult> {
  if (campaignType === 'SP') {
    return updateSPKeywordState(opts, keywordId, newState)
  } else if (campaignType === 'SB') {
    return updateSBKeywordState(opts, keywordId, newState)
  }
  return { success: false, error: `Campaign type ${campaignType} does not support keyword state updates` }
}

// ============= SB Negative Keywords =============

export interface CreateSBNegativeKeywordInput {
  campaignId: string
  adGroupId?: string
  keywordText: string
  matchType: 'negativeExact' | 'negativePhrase'
}

export async function createSBNegativeKeyword(
  opts: FetchOptions,
  input: CreateSBNegativeKeywordInput
): Promise<ApiResult & { keywordId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const isCampaignLevel = !input.adGroupId
  const url = isCampaignLevel
    ? `${baseUrl}/sb/campaignNegativeKeywords`
    : `${baseUrl}/sb/negativeKeywords`

  const contentType = isCampaignLevel
    ? 'application/vnd.sbcampaignnegativekeywordresource.v4+json'
    : 'application/vnd.sbnegativekeywordresource.v4+json'

  let body: unknown
  if (isCampaignLevel) {
    body = {
      campaignNegativeKeywords: [
        {
          campaignId: input.campaignId,
          keywordText: input.keywordText,
          matchType: input.matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
          state: 'ENABLED',
        },
      ],
    }
  } else {
    body = {
      negativeKeywords: [
        {
          campaignId: input.campaignId,
          adGroupId: input.adGroupId,
          keywordText: input.keywordText,
          matchType: input.matchType.toUpperCase().replace('NEGATIVE', 'NEGATIVE_'),
          state: 'ENABLED',
        },
      ],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SB negative keyword error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const items = isCampaignLevel ? data.campaignNegativeKeywords : data.negativeKeywords
  const result = items?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return {
    success: true,
    data,
    keywordId: result?.keywordId || result?.campaignNegativeKeywordId,
  }
}

export async function deleteSBNegativeKeyword(
  opts: FetchOptions,
  keywordId: string,
  isCampaignLevel: boolean
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const url = isCampaignLevel
    ? `${baseUrl}/sb/campaignNegativeKeywords`
    : `${baseUrl}/sb/negativeKeywords`

  const contentType = isCampaignLevel
    ? 'application/vnd.sbcampaignnegativekeywordresource.v4+json'
    : 'application/vnd.sbnegativekeywordresource.v4+json'

  let body: unknown
  if (isCampaignLevel) {
    body = {
      campaignNegativeKeywords: [
        {
          campaignNegativeKeywordId: keywordId,
          state: 'ARCHIVED',
        },
      ],
    }
  } else {
    body = {
      negativeKeywords: [
        {
          keywordId: keywordId,
          state: 'ARCHIVED',
        },
      ],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Delete SB negative keyword error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()
  return { success: true, data }
}

// ============= SB Campaign Creation =============

export interface CreateSBCampaignInput {
  name: string
  budget: number
  brandEntityId: string  // Required for SB campaigns
  startDate: string      // YYYYMMDD format
  endDate?: string
}

export async function createSBCampaign(
  opts: FetchOptions,
  input: CreateSBCampaignInput
): Promise<ApiResult & { campaignId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    campaigns: [
      {
        name: input.name,
        state: 'ENABLED',
        budget: input.budget,
        budgetType: 'DAILY',
        brandEntityId: input.brandEntityId,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sb/v4/campaigns`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sbcampaignresource.v4+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SB campaign error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.campaigns?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, campaignId: result?.campaignId }
}

// ============= SD Campaign Creation =============

export interface CreateSDCampaignInput {
  name: string
  budget: number
  tactic: 'T00020' | 'T00030'  // T00020 = product targeting, T00030 = audience targeting
  costType?: 'cpc' | 'vcpm'
  startDate: string           // YYYYMMDD format
  endDate?: string
}

export async function createSDCampaign(
  opts: FetchOptions,
  input: CreateSDCampaignInput
): Promise<ApiResult & { campaignId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    campaigns: [
      {
        name: input.name,
        state: 'ENABLED',
        budget: input.budget,
        budgetType: 'DAILY',
        tactic: input.tactic,
        costType: input.costType || 'cpc',
        startDate: input.startDate,
        endDate: input.endDate,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sd/campaigns`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sdcampaign.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SD campaign error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.campaigns?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, campaignId: result?.campaignId }
}

// ============= SB Ad Group Creation =============

export interface CreateSBAdGroupInput {
  campaignId: string
  name: string
  bid?: number
}

export async function createSBAdGroup(
  opts: FetchOptions,
  input: CreateSBAdGroupInput
): Promise<ApiResult & { adGroupId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    adGroups: [
      {
        campaignId: input.campaignId,
        name: input.name,
        state: 'ENABLED',
        bid: input.bid,
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sb/v4/adGroups`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sbadgroupresource.v4+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SB ad group error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.adGroups?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, adGroupId: result?.adGroupId }
}

// ============= SD Ad Group Creation =============

export interface CreateSDAdGroupInput {
  campaignId: string
  name: string
  defaultBid: number
  bidOptimization?: 'clicks' | 'conversions' | 'reach'
}

export async function createSDAdGroup(
  opts: FetchOptions,
  input: CreateSDAdGroupInput
): Promise<ApiResult & { adGroupId?: string }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const body = {
    adGroups: [
      {
        campaignId: input.campaignId,
        name: input.name,
        state: 'ENABLED',
        defaultBid: input.defaultBid,
        bidOptimization: input.bidOptimization || 'clicks',
      },
    ],
  }

  const response = await fetchWithRetry(`${baseUrl}/sd/adGroups`, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, 'application/vnd.sdadgroup.v3+json'),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Create SD ad group error:', error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const result = data.adGroups?.[0]
  if (result?.code && result.code !== 'SUCCESS') {
    return { success: false, error: result.details || result.code }
  }

  return { success: true, data, adGroupId: result?.adGroupId }
}

// ============= Product Target Operations =============

export interface CreateProductTargetInput {
  adGroupId: string
  campaignId?: string
  expression: Array<{ type: string; value?: string }>
  bid?: number
}

export async function createProductTargets(
  opts: FetchOptions,
  campaignType: CampaignType,
  targets: CreateProductTargetInput[]
): Promise<ApiResult & { targetIds?: string[] }> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/targets`,
      contentType: 'application/vnd.spTargetingClause.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/targets`,
      contentType: 'application/vnd.sbtargetresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/targets`,
      contentType: 'application/vnd.sdtarget.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  let body: unknown
  if (campaignType === 'SP') {
    body = {
      targetingClauses: targets.map((t) => ({
        campaignId: t.campaignId,
        adGroupId: t.adGroupId,
        expressionType: 'manual',
        expression: t.expression,
        state: 'ENABLED',
        bid: t.bid,
      })),
    }
  } else if (campaignType === 'SB') {
    body = {
      targets: targets.map((t) => ({
        adGroupId: t.adGroupId,
        expressions: t.expression,
        state: 'ENABLED',
        bid: t.bid,
      })),
    }
  } else {
    body = {
      targets: targets.map((t) => ({
        adGroupId: t.adGroupId,
        expression: t.expression,
        expressionType: 'manual',
        state: 'ENABLED',
        bid: t.bid,
      })),
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Create ${campaignType} product targets error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const results = campaignType === 'SP'
    ? data.targetingClauses || []
    : data.targets || []

  const errors = results.filter((r: { code?: string }) => r.code && r.code !== 'SUCCESS')
  if (errors.length > 0) {
    return {
      success: false,
      error: errors.map((e: { details?: string; code?: string }) => e.details || e.code).join(', ')
    }
  }

  return {
    success: true,
    data,
    targetIds: results.map((r: { targetId?: string }) => r.targetId).filter(Boolean),
  }
}

export async function updateProductTargetBid(
  opts: FetchOptions,
  campaignType: CampaignType,
  targetId: string,
  newBid: number
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/targets`,
      contentType: 'application/vnd.spTargetingClause.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/targets`,
      contentType: 'application/vnd.sbtargetresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/targets`,
      contentType: 'application/vnd.sdtarget.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  let body: unknown
  if (campaignType === 'SP') {
    body = {
      targetingClauses: [{ targetId, bid: newBid }],
    }
  } else {
    body = {
      targets: [{ targetId, bid: newBid }],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Update ${campaignType} product target bid error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const results = campaignType === 'SP'
    ? data.targetingClauses?.[0]
    : data.targets?.[0]

  if (results?.code && results.code !== 'SUCCESS') {
    return { success: false, error: results.details || results.code }
  }

  return { success: true, data }
}

export async function updateProductTargetState(
  opts: FetchOptions,
  campaignType: CampaignType,
  targetId: string,
  newState: EntityState
): Promise<ApiResult> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const endpoints: Record<CampaignType, { url: string; contentType: string }> = {
    SP: {
      url: `${baseUrl}/sp/targets`,
      contentType: 'application/vnd.spTargetingClause.v3+json',
    },
    SB: {
      url: `${baseUrl}/sb/targets`,
      contentType: 'application/vnd.sbtargetresource.v4+json',
    },
    SD: {
      url: `${baseUrl}/sd/targets`,
      contentType: 'application/vnd.sdtarget.v3+json',
    },
  }

  const { url, contentType } = endpoints[campaignType]

  let body: unknown
  if (campaignType === 'SP') {
    body = {
      targetingClauses: [{ targetId, state: newState.toUpperCase() }],
    }
  } else {
    body = {
      targets: [{ targetId, state: newState.toUpperCase() }],
    }
  }

  const response = await fetchWithRetry(url, {
    method: 'PUT',
    headers: getHeaders(accessToken, profileId, contentType),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Update ${campaignType} product target state error:`, error)
    return { success: false, error: `Amazon API error: ${response.status} - ${error}` }
  }

  const data = await response.json()

  const results = campaignType === 'SP'
    ? data.targetingClauses?.[0]
    : data.targets?.[0]

  if (results?.code && results.code !== 'SUCCESS') {
    return { success: false, error: results.details || results.code }
  }

  return { success: true, data }
}

export async function archiveProductTarget(
  opts: FetchOptions,
  campaignType: CampaignType,
  targetId: string
): Promise<ApiResult> {
  return updateProductTargetState(opts, campaignType, targetId, 'archived')
}
