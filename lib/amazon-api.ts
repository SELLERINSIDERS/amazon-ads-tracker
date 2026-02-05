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
  NormalizedCampaign,
  NormalizedAdGroup,
  NormalizedKeyword,
  CampaignType,
} from './types/amazon-api'

const DEFAULT_REGION: AmazonRegion = 'NA'

interface FetchOptions {
  accessToken: string
  profileId: string
  region?: AmazonRegion
}

function getHeaders(accessToken: string, profileId: string): HeadersInit {
  return {
    'Amazon-Advertising-API-ClientId': getClientId(),
    'Amazon-Advertising-API-Scope': profileId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.spCampaign.v3+json',
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await withRateLimit(() => fetch(url, options))

    if (response.status === 429) {
      // Rate limited - exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
      continue
    }

    return response
  }

  throw new Error('Max retries exceeded')
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
        ...getHeaders(accessToken, profileId),
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
        ...getHeaders(accessToken, profileId),
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
        ...getHeaders(accessToken, profileId),
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
        ...getHeaders(accessToken, profileId),
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

// ============= Keywords (SP only for now) =============

export async function fetchKeywords(
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
        ...getHeaders(accessToken, profileId),
        Accept: 'application/vnd.spKeyword.v3+json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Keywords error:', error)
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
  adGroups: NormalizedAdGroup[]
): Promise<NormalizedKeyword[]> {
  const keywords: NormalizedKeyword[] = []

  // Fetch keywords for each ad group
  for (const adGroup of adGroups) {
    const adGroupKeywords = await fetchKeywords(opts, adGroup.id)
    keywords.push(...adGroupKeywords)
  }

  return keywords
}
