/**
 * Amazon Advertising API client for fetching campaign data
 */

import { withRateLimit } from './rate-limiter'
import { getClientId, AMAZON_API_ENDPOINTS, type AmazonRegion } from './amazon'
import type {
  SPCampaign,
  SBCampaign,
  SDCampaign,
  AdGroupResponse,
  KeywordResponse,
  SBKeywordResponse,
  NegativeKeywordResponse,
  CampaignNegativeKeywordResponse,
  SBNegativeKeywordResponse,
  SBCampaignNegativeKeywordResponse,
  SPProductTargetResponse,
  SBProductTargetResponse,
  SDProductTargetResponse,
  NormalizedCampaign,
  NormalizedAdGroup,
  NormalizedKeyword,
  NormalizedNegativeKeyword,
  NormalizedProductTarget,
  CampaignType,
} from './types/amazon-api'

const DEFAULT_REGION: AmazonRegion = 'NA'

interface FetchOptions {
  accessToken: string
  profileId: string
  region?: AmazonRegion
}

function getHeaders(accessToken: string, profileId: string, contentType?: string): HeadersInit {
  return {
    'Amazon-Advertising-API-ClientId': getClientId(),
    'Amazon-Advertising-API-Scope': profileId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': contentType || 'application/vnd.spCampaign.v3+json',
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

// ============= Sponsored Products =============

export async function fetchSPCampaigns(
  opts: FetchOptions
): Promise<NormalizedCampaign[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const campaigns: NormalizedCampaign[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sp/campaigns/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.spCampaign.v3+json'),
        Accept: 'application/vnd.spCampaign.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SP campaigns error:', error)
      break
    }

    const data = await response.json()
    const spCampaigns: SPCampaign[] = data.campaigns || []

    for (const c of spCampaigns) {
      campaigns.push({
        id: String(c.campaignId),
        profileId,
        type: 'SP',
        name: c.name,
        state: c.state,
        budget: c.budget?.budget ?? null,
        budgetType: c.budget?.budgetType ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return campaigns
}

// ============= Sponsored Brands =============

export async function fetchSBCampaigns(
  opts: FetchOptions
): Promise<NormalizedCampaign[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const campaigns: NormalizedCampaign[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sb/v4/campaigns/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sbcampaignresource.v4+json'),
        Accept: 'application/vnd.sbcampaignresource.v4+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SB campaigns error:', error)
      break
    }

    const data = await response.json()
    const sbCampaigns: SBCampaign[] = data.campaigns || []

    for (const c of sbCampaigns) {
      campaigns.push({
        id: String(c.campaignId),
        profileId,
        type: 'SB',
        name: c.name,
        state: c.state,
        budget: c.budget ?? null,
        budgetType: c.budgetType ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return campaigns
}

// ============= Sponsored Display =============

export async function fetchSDCampaigns(
  opts: FetchOptions
): Promise<NormalizedCampaign[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const campaigns: NormalizedCampaign[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sd/campaigns/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sdcampaign.v3+json'),
        Accept: 'application/vnd.sdcampaign.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SD campaigns error:', error)
      break
    }

    const data = await response.json()
    const sdCampaigns: SDCampaign[] = data.campaigns || []

    for (const c of sdCampaigns) {
      campaigns.push({
        id: String(c.campaignId),
        profileId,
        type: 'SD',
        name: c.name,
        state: c.state,
        budget: c.budget ?? null,
        budgetType: c.budgetType ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return campaigns
}

// ============= Ad Groups =============

export async function fetchAdGroups(
  opts: FetchOptions,
  campaignId: string,
  campaignType: CampaignType
): Promise<NormalizedAdGroup[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const adGroups: NormalizedAdGroup[] = []

  // Endpoint varies by campaign type
  const endpoints: Record<CampaignType, string> = {
    SP: '/sp/adGroups/list',
    SB: '/sb/v4/adGroups/list',
    SD: '/sd/adGroups/list',
  }

  const acceptHeaders: Record<CampaignType, string> = {
    SP: 'application/vnd.spAdGroup.v3+json',
    SB: 'application/vnd.sbadgroupresource.v4+json',
    SD: 'application/vnd.sdadgroup.v3+json',
  }

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      campaignIdFilter: {
        include: [campaignId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}${endpoints[campaignType]}`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, acceptHeaders[campaignType]),
        Accept: acceptHeaders[campaignType],
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`${campaignType} ad groups error:`, error)
      break
    }

    const data = await response.json()
    const adGroupList: AdGroupResponse[] = data.adGroups || []

    for (const ag of adGroupList) {
      adGroups.push({
        id: String(ag.adGroupId),
        campaignId: String(ag.campaignId),
        name: ag.name,
        state: ag.state,
        defaultBid: ag.defaultBid ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return adGroups
}

// ============= Keywords (SP) =============

export async function fetchSPKeywords(
  opts: FetchOptions,
  adGroupId: string
): Promise<NormalizedKeyword[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const keywords: NormalizedKeyword[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      adGroupIdFilter: {
        include: [adGroupId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sp/keywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.spKeyword.v3+json'),
        Accept: 'application/vnd.spKeyword.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SP Keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: KeywordResponse[] = data.keywords || []

    for (const kw of keywordList) {
      keywords.push({
        id: String(kw.keywordId),
        adGroupId: String(kw.adGroupId),
        keywordText: kw.keywordText,
        matchType: kw.matchType,
        state: kw.state,
        bid: kw.bid ?? null,
        campaignType: 'SP',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return keywords
}

// Alias for backwards compatibility
export const fetchKeywords = fetchSPKeywords

// ============= Keywords (SB) =============

export async function fetchSBKeywords(
  opts: FetchOptions,
  adGroupId: string
): Promise<NormalizedKeyword[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const keywords: NormalizedKeyword[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      adGroupIdFilter: {
        include: [adGroupId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sb/keywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sbkeywordresource.v4+json'),
        Accept: 'application/vnd.sbkeywordresource.v4+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SB Keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: SBKeywordResponse[] = data.keywords || []

    for (const kw of keywordList) {
      keywords.push({
        id: String(kw.keywordId),
        adGroupId: String(kw.adGroupId),
        keywordText: kw.keywordText,
        matchType: kw.matchType,
        state: kw.state,
        bid: kw.bid ?? null,
        campaignType: 'SB',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return keywords
}

// ============= Fetch All =============

export async function fetchAllCampaigns(
  opts: FetchOptions
): Promise<NormalizedCampaign[]> {
  const [sp, sb, sd] = await Promise.all([
    fetchSPCampaigns(opts),
    fetchSBCampaigns(opts),
    fetchSDCampaigns(opts),
  ])

  return [...sp, ...sb, ...sd]
}

export async function fetchAllAdGroups(
  opts: FetchOptions,
  campaigns: NormalizedCampaign[]
): Promise<NormalizedAdGroup[]> {
  const adGroups: NormalizedAdGroup[] = []

  // Fetch ad groups for each campaign (in batches to respect rate limits)
  for (const campaign of campaigns) {
    const campaignAdGroups = await fetchAdGroups(opts, campaign.id, campaign.type as CampaignType)
    adGroups.push(...campaignAdGroups)
  }

  return adGroups
}

export async function fetchAllKeywords(
  opts: FetchOptions,
  adGroups: NormalizedAdGroup[],
  campaigns: NormalizedCampaign[]
): Promise<NormalizedKeyword[]> {
  const keywords: NormalizedKeyword[] = []

  // Create a map of campaignId -> campaign type
  const campaignTypeMap = new Map<string, CampaignType>()
  for (const c of campaigns) {
    campaignTypeMap.set(c.id, c.type)
  }

  // Fetch keywords for each ad group based on campaign type
  for (const adGroup of adGroups) {
    const campaignType = campaignTypeMap.get(adGroup.campaignId)

    // SP and SB campaigns have keywords, SD does not
    if (campaignType === 'SP') {
      const adGroupKeywords = await fetchSPKeywords(opts, adGroup.id)
      keywords.push(...adGroupKeywords)
    } else if (campaignType === 'SB') {
      const adGroupKeywords = await fetchSBKeywords(opts, adGroup.id)
      keywords.push(...adGroupKeywords)
    }
    // SD campaigns don't have keywords
  }

  return keywords
}

// ============= Negative Keywords (SP) =============

export async function fetchSPNegativeKeywords(
  opts: FetchOptions,
  campaignId: string
): Promise<NormalizedNegativeKeyword[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const negativeKeywords: NormalizedNegativeKeyword[] = []

  // Fetch ad-group level negative keywords
  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      campaignIdFilter: {
        include: [campaignId],
      },
      stateFilter: {
        include: ['ENABLED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sp/negativeKeywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.spNegativeKeyword.v3+json'),
        Accept: 'application/vnd.spNegativeKeyword.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SP Negative keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: NegativeKeywordResponse[] = data.negativeKeywords || []

    for (const kw of keywordList) {
      negativeKeywords.push({
        id: String(kw.keywordId),
        campaignId: String(kw.campaignId),
        adGroupId: kw.adGroupId ? String(kw.adGroupId) : null,
        keywordText: kw.keywordText,
        matchType: kw.matchType.toLowerCase().replace('negative_', 'negative'),
        state: kw.state,
        campaignType: 'SP',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  // Fetch campaign-level negative keywords
  nextToken = undefined

  do {
    const body: Record<string, unknown> = {
      campaignIdFilter: {
        include: [campaignId],
      },
      stateFilter: {
        include: ['ENABLED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sp/campaignNegativeKeywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.spCampaignNegativeKeyword.v3+json'),
        Accept: 'application/vnd.spCampaignNegativeKeyword.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SP Campaign negative keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: CampaignNegativeKeywordResponse[] = data.campaignNegativeKeywords || []

    for (const kw of keywordList) {
      negativeKeywords.push({
        id: String(kw.campaignNegativeKeywordId),
        campaignId: String(kw.campaignId),
        adGroupId: null,
        keywordText: kw.keywordText,
        matchType: kw.matchType.toLowerCase().replace('negative_', 'negative'),
        state: kw.state,
        campaignType: 'SP',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return negativeKeywords
}

// Alias for backwards compatibility
export const fetchNegativeKeywords = fetchSPNegativeKeywords

// ============= Negative Keywords (SB) =============

export async function fetchSBNegativeKeywords(
  opts: FetchOptions,
  campaignId: string
): Promise<NormalizedNegativeKeyword[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const negativeKeywords: NormalizedNegativeKeyword[] = []

  // Fetch ad-group level negative keywords
  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      campaignIdFilter: {
        include: [campaignId],
      },
      stateFilter: {
        include: ['ENABLED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sb/negativeKeywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sbnegativekeywordresource.v4+json'),
        Accept: 'application/vnd.sbnegativekeywordresource.v4+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SB Negative keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: SBNegativeKeywordResponse[] = data.negativeKeywords || []

    for (const kw of keywordList) {
      negativeKeywords.push({
        id: String(kw.keywordId),
        campaignId: String(kw.campaignId),
        adGroupId: kw.adGroupId ? String(kw.adGroupId) : null,
        keywordText: kw.keywordText,
        matchType: kw.matchType.toLowerCase().replace('negative_', 'negative'),
        state: kw.state,
        campaignType: 'SB',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  // Fetch campaign-level negative keywords
  nextToken = undefined

  do {
    const body: Record<string, unknown> = {
      campaignIdFilter: {
        include: [campaignId],
      },
      stateFilter: {
        include: ['ENABLED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sb/campaignNegativeKeywords/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sbcampaignnegativekeywordresource.v4+json'),
        Accept: 'application/vnd.sbcampaignnegativekeywordresource.v4+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SB Campaign negative keywords error:', error)
      break
    }

    const data = await response.json()
    const keywordList: SBCampaignNegativeKeywordResponse[] = data.campaignNegativeKeywords || []

    for (const kw of keywordList) {
      negativeKeywords.push({
        id: String(kw.campaignNegativeKeywordId),
        campaignId: String(kw.campaignId),
        adGroupId: null,
        keywordText: kw.keywordText,
        matchType: kw.matchType.toLowerCase().replace('negative_', 'negative'),
        state: kw.state,
        campaignType: 'SB',
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return negativeKeywords
}

export async function fetchAllNegativeKeywords(
  opts: FetchOptions,
  campaigns: NormalizedCampaign[]
): Promise<NormalizedNegativeKeyword[]> {
  const negativeKeywords: NormalizedNegativeKeyword[] = []

  // SP and SB campaigns have negative keywords via API
  for (const campaign of campaigns) {
    if (campaign.type === 'SP') {
      const campaignNegatives = await fetchSPNegativeKeywords(opts, campaign.id)
      negativeKeywords.push(...campaignNegatives)
    } else if (campaign.type === 'SB') {
      const campaignNegatives = await fetchSBNegativeKeywords(opts, campaign.id)
      negativeKeywords.push(...campaignNegatives)
    }
    // SD campaigns don't have negative keywords
  }

  return negativeKeywords
}

// ============= Product Targets (SP) =============

export async function fetchSPProductTargets(
  opts: FetchOptions,
  adGroupId: string
): Promise<NormalizedProductTarget[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const targets: NormalizedProductTarget[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      adGroupIdFilter: {
        include: [adGroupId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sp/targets/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.spTargetingClause.v3+json'),
        Accept: 'application/vnd.spTargetingClause.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SP Product targets error:', error)
      break
    }

    const data = await response.json()
    const targetList: SPProductTargetResponse[] = data.targetingClauses || []

    for (const t of targetList) {
      const expression = t.expression || t.resolvedExpression || []
      targets.push({
        id: String(t.targetId),
        adGroupId: String(t.adGroupId),
        campaignType: 'SP',
        targetType: expression[0]?.type || 'unknown',
        expressionType: t.expressionType,
        expression: JSON.stringify(expression),
        state: t.state,
        bid: t.bid ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return targets
}

// ============= Product Targets (SB) =============

export async function fetchSBProductTargets(
  opts: FetchOptions,
  adGroupId: string
): Promise<NormalizedProductTarget[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const targets: NormalizedProductTarget[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      adGroupIdFilter: {
        include: [adGroupId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sb/targets/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sbtargetresource.v4+json'),
        Accept: 'application/vnd.sbtargetresource.v4+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SB Product targets error:', error)
      break
    }

    const data = await response.json()
    const targetList: SBProductTargetResponse[] = data.targets || []

    for (const t of targetList) {
      const expression = t.expressions || []
      targets.push({
        id: String(t.targetId),
        adGroupId: String(t.adGroupId),
        campaignType: 'SB',
        targetType: expression[0]?.type || 'unknown',
        expressionType: 'manual',  // SB targets are always manual
        expression: JSON.stringify(expression),
        state: t.state,
        bid: t.bid ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return targets
}

// ============= Product Targets (SD) =============

export async function fetchSDProductTargets(
  opts: FetchOptions,
  adGroupId: string
): Promise<NormalizedProductTarget[]> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]
  const targets: NormalizedProductTarget[] = []

  let nextToken: string | undefined

  do {
    const body: Record<string, unknown> = {
      adGroupIdFilter: {
        include: [adGroupId],
      },
      stateFilter: {
        include: ['ENABLED', 'PAUSED'],
      },
      maxResults: 100,
    }
    if (nextToken) {
      body.nextToken = nextToken
    }

    const response = await fetchWithRetry(`${baseUrl}/sd/targets/list`, {
      method: 'POST',
      headers: {
        ...getHeaders(accessToken, profileId, 'application/vnd.sdtarget.v3+json'),
        Accept: 'application/vnd.sdtarget.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SD Product targets error:', error)
      break
    }

    const data = await response.json()
    const targetList: SDProductTargetResponse[] = data.targets || []

    for (const t of targetList) {
      const expression = t.expression || []
      targets.push({
        id: String(t.targetId),
        adGroupId: String(t.adGroupId),
        campaignType: 'SD',
        targetType: expression[0]?.type || 'unknown',
        expressionType: t.expressionType,
        expression: JSON.stringify(expression),
        state: t.state,
        bid: t.bid ?? null,
      })
    }

    nextToken = data.nextToken
  } while (nextToken)

  return targets
}

// ============= Fetch All Product Targets =============

export async function fetchAllProductTargets(
  opts: FetchOptions,
  adGroups: NormalizedAdGroup[],
  campaigns: NormalizedCampaign[]
): Promise<NormalizedProductTarget[]> {
  const targets: NormalizedProductTarget[] = []

  // Create a map of campaignId -> campaign type
  const campaignTypeMap = new Map<string, CampaignType>()
  for (const c of campaigns) {
    campaignTypeMap.set(c.id, c.type)
  }

  // Fetch targets for each ad group based on campaign type
  for (const adGroup of adGroups) {
    const campaignType = campaignTypeMap.get(adGroup.campaignId)

    if (campaignType === 'SP') {
      const adGroupTargets = await fetchSPProductTargets(opts, adGroup.id)
      targets.push(...adGroupTargets)
    } else if (campaignType === 'SB') {
      const adGroupTargets = await fetchSBProductTargets(opts, adGroup.id)
      targets.push(...adGroupTargets)
    } else if (campaignType === 'SD') {
      const adGroupTargets = await fetchSDProductTargets(opts, adGroup.id)
      targets.push(...adGroupTargets)
    }
  }

  return targets
}
