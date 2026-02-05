// Amazon Advertising API response types

export type CampaignType = 'SP' | 'SB' | 'SD'
export type EntityState = 'enabled' | 'paused' | 'archived'
export type MatchType = 'exact' | 'phrase' | 'broad'

// Sponsored Products Campaign
export interface SPCampaign {
  campaignId: number
  name: string
  state: EntityState
  budget: {
    budget: number
    budgetType: 'DAILY'
  }
  startDate?: string
  endDate?: string
  portfolioId?: number
  dynamicBidding?: {
    strategy: string
  }
}

// Sponsored Brands Campaign
export interface SBCampaign {
  campaignId: number
  name: string
  state: EntityState
  budget: number
  budgetType: 'DAILY'
  startDate?: string
  endDate?: string
  brandEntityId?: string
}

// Sponsored Display Campaign
export interface SDCampaign {
  campaignId: number
  name: string
  state: EntityState
  budget: number
  budgetType: 'DAILY'
  startDate?: string
  endDate?: string
  tactic?: string
}

// Ad Group (shared structure)
export interface AdGroupResponse {
  adGroupId: number
  campaignId: number
  name: string
  state: EntityState
  defaultBid?: number
}

// Keyword
export interface KeywordResponse {
  keywordId: number
  adGroupId: number
  campaignId?: number
  keywordText: string
  matchType: MatchType
  state: EntityState
  bid?: number
}

// List response wrapper
export interface ListResponse<T> {
  campaigns?: T[]
  adGroups?: T[]
  keywords?: T[]
  nextToken?: string
  totalResults?: number
}

// Normalized campaign for internal use
export interface NormalizedCampaign {
  id: string
  profileId: string
  type: CampaignType
  name: string
  state: string
  budget: number | null
  budgetType: string | null
  startDate: string | null
  endDate: string | null
}

// Normalized ad group for internal use
export interface NormalizedAdGroup {
  id: string
  campaignId: string
  name: string
  state: string
  defaultBid: number | null
}

// Normalized keyword for internal use
export interface NormalizedKeyword {
  id: string
  adGroupId: string
  keywordText: string
  matchType: string
  state: string
  bid: number | null
}

// Sync result
export interface SyncResult {
  success: boolean
  error?: string
  stats?: {
    campaigns: number
    adGroups: number
    keywords: number
  }
}
