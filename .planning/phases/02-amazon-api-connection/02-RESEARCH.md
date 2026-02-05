# Phase 2 Research: Amazon API Connection

## Overview

Phase 2 implements Amazon Advertising API OAuth2 connection using the @scaleleap/amazon-advertising-api-sdk.

## Key Findings

### OAuth2 Flow

1. **Authorization URL**: Generated with client_id, scope, response_type=code, redirect_uri
2. **Auth Code**: Valid for 5 minutes after user authorization
3. **Token Exchange**: POST to regional endpoint with auth code
4. **Token Refresh**: Use refresh_token to get new access_token

### SDK Usage (@scaleleap/amazon-advertising-api-sdk)

```typescript
import { OAuthClient, HttpClient, OperationProvider } from '@scaleleap/amazon-advertising-api-sdk'

// OAuth client for token operations
const oauthClient = new OAuthClient({
  clientId: process.env.LWA_CLIENT_ID,
  clientSecret: process.env.LWA_CLIENT_SECRET,
})

// Generate auth URL
const authUrl = oauthClient.getUri()

// Exchange auth code for tokens
const token = await oauthClient.getToken(authCode)

// Refresh token
const refreshedToken = oauthClient.createToken(accessToken, refreshToken)
const newToken = await refreshedToken.refresh()

// List profiles
const httpClient = new HttpClient('advertising-api.amazon.com', accessToken, clientId)
const operationProvider = new OperationProvider(httpClient)
const profiles = await operationProvider.profileOperation().listProfiles()
```

### Token Structure

```json
{
  "access_token": "Atza|...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "Atzr|..."
}
```

- Access token expires in 1 hour (3600 seconds)
- Refresh token doesn't expire unless revoked
- Store `expiresAt = now() + expires_in` for proactive refresh

### Rate Limiting

- 10 req/sec burst limit
- 2 req/sec sustained rate
- Token bucket algorithm
- Implement backoff for 429 responses

### Regional Endpoints

- North America: advertising-api.amazon.com
- Europe: advertising-api-eu.amazon.com
- Far East: advertising-api-fe.amazon.com

## Implementation Approach

### Plan 02-01: Schema & SDK Setup
- Add AmazonCredential model to Prisma schema
- Install @scaleleap/amazon-advertising-api-sdk
- Create lib/amazon.ts with SDK initialization

### Plan 02-02: OAuth Flow & Settings Page
- Create settings page at /settings
- Generate OAuth URL display
- Auth code input form
- Token exchange API endpoint

### Plan 02-03: Token Refresh & Profile Selection
- Implement token refresh with mutex
- Profile list API endpoint
- Profile selection UI
- Token health display

## Database Schema

```prisma
model AmazonCredential {
  id           String   @id @default(cuid())
  accessToken  String
  refreshToken String
  expiresAt    DateTime
  profileId    String?
  profileName  String?
  countryCode  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## Environment Variables Needed

```
LWA_CLIENT_ID=<Login with Amazon client ID>
LWA_CLIENT_SECRET=<Login with Amazon client secret>
```

---
*Research completed: 2026-02-05*
