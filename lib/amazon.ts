const LWA_CLIENT_ID = process.env.AMAZON_CLIENT_ID || ''
const LWA_CLIENT_SECRET = process.env.AMAZON_CLIENT_SECRET || ''

// OAuth scopes required for Amazon Advertising API
const OAUTH_SCOPES = ['advertising::campaign_management']

// Regional API endpoints
export const AMAZON_API_ENDPOINTS = {
  NA: 'https://advertising-api.amazon.com',
  EU: 'https://advertising-api-eu.amazon.com',
  FE: 'https://advertising-api-fe.amazon.com',
} as const

export type AmazonRegion = keyof typeof AMAZON_API_ENDPOINTS

// Token response from Amazon OAuth
export interface AmazonTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

// Redirect URI for OAuth callback
const REDIRECT_URI = process.env.AMAZON_REDIRECT_URI || 'http://localhost:3001/api/amazon/callback'

// Generate authorization URL for user to visit
export function generateAuthorizationUrl(): string {
  const baseUrl = 'https://www.amazon.com/ap/oa'
  const params = new URLSearchParams({
    client_id: LWA_CLIENT_ID,
    scope: OAUTH_SCOPES.join(' '),
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
  })

  return `${baseUrl}?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(authCode: string): Promise<AmazonTokenResponse> {
  const tokenUrl = 'https://api.amazon.com/auth/o2/token'

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      client_id: LWA_CLIENT_ID,
      client_secret: LWA_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<AmazonTokenResponse> {
  const tokenUrl = 'https://api.amazon.com/auth/o2/token'

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: LWA_CLIENT_ID,
      client_secret: LWA_CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

// Calculate token expiry datetime
export function calculateExpiresAt(expiresIn: number): Date {
  // Subtract 5 minutes buffer for proactive refresh
  const bufferSeconds = 5 * 60
  return new Date(Date.now() + (expiresIn - bufferSeconds) * 1000)
}

// Check if token is expired or about to expire
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= expiresAt
}

// Get configured client ID (for API calls)
export function getClientId(): string {
  return LWA_CLIENT_ID
}

// Amazon Advertising Profile
export interface AmazonProfile {
  profileId: string
  countryCode: string
  currencyCode: string
  timezone: string
  accountInfo: {
    id: string
    type: string
    name: string
    validPaymentMethod: boolean
    marketplaceStringId: string
  }
}

// Simple in-memory mutex for token refresh to prevent race conditions
let refreshLock: Promise<void> | null = null

// Get valid access token, refreshing if needed
export async function getValidAccessToken(
  credential: { accessToken: string; refreshToken: string; expiresAt: Date; id: string },
  updateCredential: (id: string, accessToken: string, expiresAt: Date) => Promise<void>
): Promise<string> {
  // Check if token is still valid
  if (!isTokenExpired(credential.expiresAt)) {
    return credential.accessToken
  }

  // Acquire lock to prevent concurrent refresh attempts
  if (refreshLock) {
    await refreshLock
    // After waiting, the token should be refreshed, so return it
    return credential.accessToken
  }

  // Create lock and refresh token
  let releaseLock: () => void
  refreshLock = new Promise((resolve) => {
    releaseLock = resolve
  })

  try {
    const tokenResponse = await refreshAccessToken(credential.refreshToken)
    const newExpiresAt = calculateExpiresAt(tokenResponse.expires_in)

    // Update credential in database
    await updateCredential(credential.id, tokenResponse.access_token, newExpiresAt)

    // Update the credential object for immediate use
    credential.accessToken = tokenResponse.access_token
    credential.expiresAt = newExpiresAt

    return tokenResponse.access_token
  } finally {
    refreshLock = null
    releaseLock!()
  }
}

// List Amazon Advertising profiles
export async function listProfiles(accessToken: string): Promise<AmazonProfile[]> {
  const response = await fetch(`${AMAZON_API_ENDPOINTS.NA}/v2/profiles`, {
    method: 'GET',
    headers: {
      'Amazon-Advertising-API-ClientId': LWA_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list profiles: ${error}`)
  }

  return response.json()
}

// Determine region from country code
export function getRegionFromCountryCode(countryCode: string): AmazonRegion {
  const regionMap: Record<string, AmazonRegion> = {
    US: 'NA',
    CA: 'NA',
    MX: 'NA',
    BR: 'NA',
    UK: 'EU',
    GB: 'EU',
    DE: 'EU',
    FR: 'EU',
    IT: 'EU',
    ES: 'EU',
    NL: 'EU',
    PL: 'EU',
    SE: 'EU',
    TR: 'EU',
    AE: 'EU',
    SA: 'EU',
    EG: 'EU',
    IN: 'EU',
    JP: 'FE',
    AU: 'FE',
    SG: 'FE',
  }

  return regionMap[countryCode] || 'NA'
}
