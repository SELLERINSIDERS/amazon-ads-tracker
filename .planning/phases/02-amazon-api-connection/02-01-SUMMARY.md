# Summary 02-01: Schema & SDK Setup

## Status: Complete

## What Was Done

1. **Updated Prisma Schema**
   - Added `AmazonCredential` model with fields:
     - accessToken, refreshToken, expiresAt
     - profileId, profileName, countryCode, marketplace
     - createdAt, updatedAt

2. **Installed SDK**
   - Added `@scaleleap/amazon-advertising-api-sdk` to dependencies

3. **Updated .env.example**
   - Added `LWA_CLIENT_ID` and `LWA_CLIENT_SECRET` placeholders

4. **Ran Migration**
   - Created migration `20260205042314_add_amazon_credentials`
   - Database schema updated successfully

5. **Created lib/amazon.ts**
   - `generateAuthorizationUrl()` - Generate OAuth URL
   - `exchangeCodeForTokens()` - Exchange auth code for tokens
   - `refreshAccessToken()` - Refresh expired tokens
   - `calculateExpiresAt()` - Calculate expiry with 5-min buffer
   - `isTokenExpired()` - Check token expiry
   - Regional endpoint constants

## Files Changed
- `prisma/schema.prisma` - Added AmazonCredential model
- `prisma/migrations/20260205042314_add_amazon_credentials/` - New migration
- `.env.example` - Added LWA env vars
- `lib/amazon.ts` - New file with OAuth helpers
- `package.json` - New dependency

## Verification
- [x] Prisma schema compiles without errors
- [x] Migration runs successfully
- [x] SDK installed in package.json
- [x] lib/amazon.ts exports OAuth helpers

---
*Completed: 2026-02-05*
