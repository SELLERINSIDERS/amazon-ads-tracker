# Phase 2 Verification: Amazon API Connection

## Goal
App can authenticate with Amazon Ads API and maintain valid tokens.

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| AMZN-01: Generate OAuth URL from settings | ✓ Complete | Settings page displays authorization URL with copy button |
| AMZN-02: Paste auth code and exchange for tokens | ✓ Complete | Auth code form exchanges code via Amazon token endpoint |
| AMZN-03: Auto-refresh token with mutex | ✓ Complete | `getValidAccessToken()` uses in-memory mutex lock |
| AMZN-04: View token health in settings | ✓ Complete | Token Health section shows status, expiry, last update |
| AMZN-05: Select advertising profile | ✓ Complete | ProfileSelector dropdown loads and saves profiles |
| AMZN-06: Tokens stored in database | ✓ Complete | AmazonCredential model stores tokens in SQLite |

## Success Criteria Verification

1. **User can generate Amazon OAuth authorization URL from settings page** ✓
   - `/settings` page displays full OAuth URL
   - Copy button works, link opens Amazon auth page

2. **User can paste auth code and app exchanges it for tokens within 5 minutes** ✓
   - Form accepts auth code input
   - `exchangeCodeForTokens()` posts to Amazon token endpoint
   - Tokens saved to database on success

3. **App automatically refreshes access token before expiry without race conditions** ✓
   - `getValidAccessToken()` checks expiry before API calls
   - In-memory mutex prevents concurrent refresh attempts
   - 5-minute buffer for proactive refresh

4. **User can view token health in settings** ✓
   - Token Health section shows:
     - Status (Active/Needs Refresh)
     - Time until expiry
     - Last updated timestamp
   - Auto-refresh explanation text included

5. **User can select Amazon advertising profile after OAuth connection** ✓
   - ProfileSelector component loads profiles from API
   - Dropdown shows account name, country, type
   - Selection saved to database

6. **Rate limiter enforces 10 req/sec burst and 2 req/sec sustained limits** ✓
   - Token bucket implementation in `lib/rate-limiter.ts`
   - Profile API uses `withRateLimit()` wrapper
   - Queue system for excess requests with 30s timeout

## Build Verification

```
✓ npm run build completes successfully
✓ No TypeScript errors
✓ No ESLint errors
```

## Files Created

### Database
- `prisma/migrations/20260205042314_add_amazon_credentials/` - Schema migration

### Library
- `lib/amazon.ts` - OAuth helpers, token refresh, profile listing
- `lib/rate-limiter.ts` - Token bucket rate limiter

### API Routes
- `app/api/amazon/profiles/route.ts` - GET/POST profile operations

### UI Components
- `app/(dashboard)/settings/page.tsx` - Settings page
- `app/(dashboard)/settings/actions.ts` - Server actions
- `app/(dashboard)/settings/amazon-connection-card.tsx` - OAuth flow UI
- `app/(dashboard)/settings/profile-selector.tsx` - Profile dropdown

### Updated
- `app/(dashboard)/layout.tsx` - Added Settings nav link
- `app/(dashboard)/dashboard/page.tsx` - Shows connection status
- `.env.example` - Added LWA credentials
- `middleware.ts` - Fixed type issues

## Phase Complete

All requirements met. Phase 2 is ready for commit.

---
*Verified: 2026-02-05*
