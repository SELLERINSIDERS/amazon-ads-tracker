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
  targetingType?: 'MANUAL' | 'AUTO'
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
  tactic?: string  // T00020 (product targeting), T00030 (audience targeting)
  costType?: 'cpc' | 'vcpm'
}

// Ad Group (shared structure)
export interface AdGroupResponse {
  adGroupId: number
  campaignId: number
  name: string
  state: EntityState
  defaultBid?: number
}

// Keyword (SP)
export interface KeywordResponse {
  keywordId: number
  adGroupId: number
  campaignId?: number
  keywordText: string
  matchType: MatchType
  state: EntityState
  bid?: number
}

// SB Keyword
export interface SBKeywordResponse {
  keywordId: number
  adGroupId: number
  campaignId: number
  keywordText: string
  matchType: MatchType
  state: EntityState
  bid?: number
}

// SB Negative Keyword
export interface SBNegativeKeywordResponse {
  keywordId: number
  campaignId: number
  adGroupId?: number
  keywordText: string
  matchType: string
  state: EntityState
}

// SB Campaign-level Negative Keyword
export interface SBCampaignNegativeKeywordResponse {
  campaignNegativeKeywordId: number
  campaignId: number
  keywordText: string
  matchType: string
  state: EntityState
}

// Product Target Expression
export interface TargetExpression {
  type: string  // asinSameAs, asinCategorySameAs, asinBrandSameAs, etc.
  value?: string
}

// SP Product Target
export interface SPProductTargetResponse {
  targetId: number
  adGroupId: number
  campaignId?: number
  expressionType: 'auto' | 'manual'
  expression: TargetExpression[]
  resolvedExpression?: TargetExpression[]
  state: EntityState
  bid?: number
}

// SB Product Target
export interface SBProductTargetResponse {
  targetId: number
  adGroupId: number
  campaignId?: number
  expressions: TargetExpression[]
  state: EntityState
  bid?: number
}

// SD Product Target
export interface SDProductTargetResponse {
  targetId: number
  adGroupId: number
  expression: TargetExpression[]
  expressionType: 'auto' | 'manual'
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
  brandEntityId?: string | null   // SB only
  tactic?: string | null          // SD only
  costType?: string | null        // SD only
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
  campaignType?: CampaignType
}

// Negative keyword types
export type NegativeMatchType = 'negativeExact' | 'negativePhrase'

// Negative keyword response from Amazon API
export interface NegativeKeywordResponse {
  keywordId: number
  campaignId: number
  adGroupId?: number
  keywordText: string
  matchType: string
  state: EntityState
}

// Campaign-level negative keyword response
export interface CampaignNegativeKeywordResponse {
  campaignNegativeKeywordId: number
  campaignId: number
  keywordText: string
  matchType: string
  state: EntityState
}

// Normalized negative keyword for internal use
export interface NormalizedNegativeKeyword {
  id: string
  campaignId: string
  adGroupId: string | null
  keywordText: string
  matchType: string
  state: string
  campaignType?: CampaignType
}

// Normalized product target for internal use
export interface NormalizedProductTarget {
  id: string
  adGroupId: string
  campaignType: CampaignType
  targetType: string
  expressionType: string
  expression: string  // JSON stringified
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
    negativeKeywords?: number
    productTargets?: number
    campaignMetrics?: number
    keywordMetrics?: number
    productTargetMetrics?: number
  }
}
