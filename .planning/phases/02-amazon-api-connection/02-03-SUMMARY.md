# Summary 02-03: Token Refresh & Profile Selection

## Status: Complete

## What Was Done

1. **Implemented Token Refresh with Mutex**
   - Added `getValidAccessToken()` function with in-memory mutex
   - Prevents concurrent refresh attempts with lock mechanism
   - Auto-refreshes tokens 5 minutes before expiry

2. **Created Profile List API**
   - `GET /api/amazon/profiles` - Lists all advertising profiles
   - Uses rate limiting via token bucket
   - Refreshes token if needed before API call

3. **Created Profile Selection API**
   - `POST /api/amazon/profiles` - Saves selected profile to database
   - Updates credential record with profile info

4. **Added Profile Selection UI**
   - `ProfileSelector` component with dropdown
   - Loads profiles on mount
   - Saves selection and reloads page

5. **Added Token Health Display**
   - Shows token status (Active/Needs Refresh)
   - Shows time until expiry
   - Shows last updated timestamp
   - Explains auto-refresh behavior

6. **Implemented Rate Limiter**
   - Token bucket algorithm (10 burst, 2/sec sustained)
   - Queue for requests when bucket empty
   - 30-second timeout for queued requests
   - `withRateLimit()` wrapper function

## Files Created/Changed
- `lib/amazon.ts` - Extended with profile listing, token refresh
- `lib/rate-limiter.ts` - New token bucket rate limiter
- `app/api/amazon/profiles/route.ts` - Profile list and select APIs
- `app/(dashboard)/settings/profile-selector.tsx` - Profile dropdown component
- `app/(dashboard)/settings/amazon-connection-card.tsx` - Added health display and profile selector

## Verification
- [x] Token refreshes automatically before expiry
- [x] Profile list API works (when credentials exist)
- [x] User can select and save profile
- [x] Token health shows accurate status
- [x] Rate limiter enforces limits
- [x] Build passes with no errors

---
*Completed: 2026-02-05*
