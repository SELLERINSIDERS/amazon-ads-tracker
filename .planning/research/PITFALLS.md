# Pitfalls Research

**Domain:** Amazon PPC Management Dashboard
**Researched:** 2026-02-04
**Confidence:** MEDIUM (Based on Amazon Ads API documentation patterns, PPC domain knowledge, and project context. Unable to verify with current web sources.)

---

## Critical Pitfalls

### Pitfall 1: OAuth2 Token Refresh Race Conditions

**What goes wrong:**
Amazon Ads API OAuth2 access tokens expire after 1 hour. Refresh tokens expire after 1 year (or when not used for extended periods). When multiple concurrent API requests trigger token refresh simultaneously, the SDK may generate multiple refresh token requests, invalidating each other and breaking authentication completely.

**Why it happens:**
- Developers assume the SDK handles token refresh atomically
- No mutex/lock around token refresh logic
- Multiple API calls start simultaneously when token is about to expire
- Refresh token gets used multiple times, invalidating subsequent refresh attempts

**How to avoid:**
- Implement application-level token refresh lock (mutex) wrapping SDK calls
- Store tokens in database with `updatedAt` timestamp to detect stale reads
- Add retry logic with exponential backoff specifically for 401 responses
- Monitor token refresh failures and alert on consecutive failures (>2)
- Consider proactive token refresh (refresh at 50 minutes instead of waiting for 401)

**Warning signs:**
- Intermittent 401 errors that resolve after manual re-authentication
- Multiple "token refresh" log entries within same second
- "Invalid refresh token" errors appearing randomly
- Dashboard requiring re-authentication more than once per year

**Phase to address:**
Phase 1 (Amazon API OAuth2 Integration) — Must be solid from day one, cannot band-aid later

---

### Pitfall 2: Amazon API Rate Limit Violations Leading to Account Suspension

**What goes wrong:**
Amazon Ads API enforces 10 req/sec burst and ~2 req/sec sustained limits. Exceeding these consistently can lead to temporary API suspension (hours to days) or permanent account restrictions. A naive sync implementation that fetches campaigns → ad groups → keywords → metrics sequentially for hundreds of items will hit rate limits within seconds.

**Why it happens:**
- Developers test with small accounts (5-10 campaigns) where rate limits never hit
- Sync logic uses sequential Promise chains instead of queued batching
- No rate limiter between application and SDK
- Retry logic on 429 responses creates retry storms
- Rules engine or agent actions trigger cascading API calls

**How to avoid:**
- Implement token bucket rate limiter BEFORE any SDK call (2 req/sec sustained, 10 burst)
- Use queue system (Bull/BullMQ) with concurrency=2 and rate=2/sec for all API operations
- Add request deduplication (don't fetch same campaign metrics twice in 5 minutes)
- Implement circuit breaker that stops all API calls after 3 consecutive 429s
- Mock large account data in tests (100+ campaigns) to surface rate limit issues early
- Add `/admin/api-health` endpoint showing recent rate limit metrics

**Warning signs:**
- 429 "Too Many Requests" responses in logs
- API calls taking progressively longer (queue backing up)
- Sudden API errors after working fine initially (hit sustained limit)
- Sync jobs failing on large accounts but succeeding on small ones

**Phase to address:**
Phase 2 (Campaign Data Sync) — Rate limiting must be in place BEFORE first real sync

---

### Pitfall 3: Stale Data Making Rollback Dangerous

**What goes wrong:**
User makes bid change via dashboard. Meanwhile, Amazon Ads console or another tool modifies the same keyword bid. User clicks "rollback" in audit trail, expecting to undo their change, but instead overwrites the external change they weren't aware of — potentially causing significant budget/performance impact.

**Why it happens:**
- Audit trail stores "before" snapshot at action time, not at rollback time
- No sync before rollback to detect external changes
- No diff shown to user before rollback executes
- Rollback implementation uses `UPDATE ... SET bid = $1` without `WHERE bid = $2` check

**How to avoid:**
- Before rollback: fetch current state from Amazon API (sync that specific entity)
- Show 3-way diff: "Your change" vs "Current state" vs "Rollback target"
- Require explicit confirmation if current state ≠ audit trail "after" state
- Use optimistic locking: `UPDATE ... WHERE bid = $expectedCurrentValue`
- Add "force rollback" checkbox for cases where user knows state diverged
- Log rollback diffs separately in audit trail for post-mortem

**Warning signs:**
- User reports "rollback didn't work" or "made things worse"
- Bid values in dashboard don't match Amazon Ads console
- Frequent "unexpected bid value" errors during rollback
- Sync job shows many "external changes detected" after rollbacks

**Phase to address:**
Phase 8 (Audit Trail + Rollback) — Critical for safe rollback implementation

---

### Pitfall 4: Rules Engine Cascade Effects Creating Runaway Changes

**What goes wrong:**
Rule A: "If ACoS > 30%, decrease bid by 10%"
Rule B: "If impressions < 100/day, increase bid by 15%"
A low-performing keyword triggers both rules simultaneously, or they alternate execution on each run, creating oscillating bid changes that never stabilize. Over days, bids drift to extremes (near zero or max).

**Why it happens:**
- Rules evaluated independently without checking for conflicts
- No "cooldown period" between rule executions on same entity
- Rules lack context of recent changes (only look at current metrics)
- No simulation/dry-run mode before enabling rules
- Safety limits applied per-action instead of per-entity-per-day

**How to avoid:**
- Add "last modified by rule" and "last modified at" to all entities
- Enforce cooldown: don't apply rule if same entity modified in last 24 hours
- Implement conflict detection: warn when multiple rules target overlapping entities
- Add "max changes per entity per day" safety limit (default: 1)
- Require dry-run mode for new rules (7-day simulation showing what would have happened)
- Log rule execution chains: "Rule A triggered → bid changed → Rule B now applies (blocked by cooldown)"

**Warning signs:**
- Audit trail shows same keyword modified by multiple rules in short timeframe
- Bids approaching safety limit boundaries (min/max bid)
- Rules execution history shows "action blocked by safety limit" repeatedly
- Metrics show high volatility after enabling rules engine

**Phase to address:**
Phase 6 (Rules Engine) — Conflict detection and cooldown must be in architecture from day one

---

### Pitfall 5: Incomplete Audit Trail Missing Critical State

**What goes wrong:**
Audit trail logs "User changed keyword bid from $1.50 to $2.00" but doesn't capture:
- Which campaign/ad group the keyword belongs to (orphaned reference)
- Current match type, status, or other context
- Why user made the change (no notes field)
- What the metrics were at decision time

When rollback happens months later, keyword might have moved to different ad group, been archived, or campaign deleted — rollback fails silently or corrupts data.

**Why it happens:**
- Audit trail only stores changed fields, not full entity snapshot
- No denormalization of parent relationships (campaign name, ad group name)
- Assumes entities never get deleted or moved
- No validation that rollback target still exists before execution

**How to avoid:**
- Store complete "before" and "after" snapshots (JSON) including parent relationships
- Denormalize display fields: store campaign name, ad group name even if they change later
- Add optional "reason" field for manual actions (surfaced in UI, not required)
- Store relevant metrics at action time (ACoS, spend, conversions from last 7 days)
- Validate rollback: check entity exists, is same type, parent relationships haven't changed
- If entity deleted: show "cannot rollback, entity deleted on [date]" instead of failing silently

**Warning signs:**
- Rollback failures with cryptic "entity not found" errors
- Audit trail showing actions on "Unknown Campaign"
- Unable to reconstruct decision context from audit trail alone
- Rollback succeeding but appearing to do nothing (entity was deleted/recreated)

**Phase to address:**
Phase 8 (Audit Trail + Rollback) — Data model must be comprehensive from start

---

### Pitfall 6: Amazon API Data Model Mismatches

**What goes wrong:**
Amazon Ads API has three campaign types (Sponsored Products, Sponsored Brands, Sponsored Display) with different schemas. Keywords exist for SP campaigns but not SB/SD. Developers model everything as "Campaign → AdGroup → Keyword" and break when syncing SB campaigns that use different targeting types.

**Why it happens:**
- Database schema designed around single campaign type
- No discriminator field for campaign type
- Prisma models assume all campaigns have same structure
- Sync logic uses same code path for all campaign types
- UI components assume keywords always exist

**How to avoid:**
- Add `campaignType` enum to Campaign model (SP, SB, SD)
- Model targeting separately: `Keyword` (SP only), `Product` (SB), `Audience` (SD)
- Use Prisma polymorphic relations or separate tables per targeting type
- Sync logic: dispatch to type-specific handlers based on campaign type
- UI components: conditionally render based on campaign type
- Validate assumptions in tests: "SB campaigns cannot have keywords"

**Warning signs:**
- Sync failures on certain campaign types
- Keywords showing up for Sponsored Brands campaigns (impossible)
- NULL values in required fields for specific campaign types
- "Unknown targeting type" errors in logs

**Phase to address:**
Phase 2 (Campaign Data Sync) — Data model must support all campaign types from start

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip rate limiting for first 2 phases | Faster initial development | API suspension risk, hard to retrofit into 50+ API call sites | Never — rate limiter is 50 lines of code |
| Store tokens in memory instead of database | Simpler initial OAuth flow | Lose tokens on restart, can't debug token refresh issues | Never — SQLite insert is trivial |
| Single `AuditLog` table without snapshots | Faster to implement | Cannot rollback, cannot debug issues, compliance risk | Never — snapshots are core value proposition |
| No campaign type discriminator | Works if only testing SP campaigns | Breaks on real accounts with SB/SD, requires migration | Never — add enum field from day one |
| Optimistic UI updates without sync confirmation | Feels faster to user | User sees stale data, changes silently fail, rollback impossible | Never for PPC (money involved) |
| Skip safety limits in development | Easier to test rule changes | Accidentally push to production without limits, catastrophic spend | Only in test mode with mock API |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Amazon Ads API OAuth | Storing auth code instead of access token | Exchange auth code within 5 minutes, store access + refresh tokens |
| Amazon Ads API profiles | Assuming single profile per account | Fetch all profiles, let user select, store `profileId` with every API call |
| SDK token refresh | Letting SDK handle persistence | Override token refresh callback to persist to database immediately |
| Amazon Ads API sync | Fetching all historical metrics on every sync | Sync only last 30 days, backfill older data on-demand |
| Rate limiting | Implementing per-endpoint limits | Global rate limit across all Amazon API calls regardless of endpoint |
| Timezone handling | Using local timezone for date ranges | Amazon API expects dates in account timezone (PST), store timezone per account |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Syncing all campaigns on every request | Dashboard loads slowly | Background job every 15 minutes, cache in DB | >10 campaigns |
| Loading full audit log on page load | Settings page hangs | Paginate audit log (50 entries/page), server-side filtering | >500 actions logged |
| Sequential API calls for metrics | Sync takes 5+ minutes | Batch requests where possible, use reporting API for bulk metrics | >20 campaigns |
| No indexes on audit log queries | Filtering/search becomes unusable | Index on `entityType`, `entityId`, `createdAt`, `actionType` | >1000 audit entries |
| Fetching search terms for all keywords | Search terms page times out | Paginate keywords, fetch search terms on-demand per keyword | >100 keywords |
| N+1 queries for campaign metrics | Dashboard shows loading spinners | Join campaigns + metrics in single query, eager load in Prisma | >5 campaigns |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing Amazon API credentials in client-side code | Credential leak, unauthorized API access | Keep all credentials server-side, use session-based auth for dashboard |
| No CORS validation on agent API endpoints | External attackers can trigger bid changes | Whitelist agent IP or require API key in header, validate origin |
| Logging full API tokens in audit trail | Token leak in logs exposes account | Log only last 8 chars of tokens, redact in structured logging |
| No action confirmation for bulk changes | Accidental bulk bid increase | Require confirmation dialog for actions affecting >10 entities |
| Weak dashboard password | Unauthorized access to campaign data + API | Enforce min 12 chars, check against common passwords, consider 2FA later |
| Exposing internal IDs in agent API | Enumeration attacks, ID prediction | Use UUIDs for external API, internal IDs only in database |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw API errors to user | "Invalid request: field 'bid' must be between 20-500" confuses user (cents vs dollars) | Translate API errors to user terms, add context: "Bid must be between $0.20 and $5.00" |
| No undo for inline edits | User accidentally changes wrong campaign budget, panics | Show confirmation for budget changes >20%, add "undo last change" button |
| Hiding Amazon API sync status | User changes bid, doesn't see it in Amazon console, thinks it failed | Show "Last synced: 2 minutes ago" + "Sync now" button, indicate pending changes |
| No visual diff in audit trail | User sees "bid changed" but can't tell significance | Show percentage change, color-code impact (green <5%, yellow <15%, red >15%) |
| Displaying metrics without context | "ACoS: 28.5%" — is that good or bad? | Show trend arrow, comparison to target, campaign average |
| No loading states for API actions | User clicks "Update bid", nothing happens for 3 seconds, clicks again | Optimistic UI update + spinner, disable button during request, show success toast |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OAuth2 flow:** Often missing token refresh error handling — verify refresh works after 1+ hour
- [ ] **Rate limiting:** Often only checks limits, doesn't queue requests — verify queue processes requests in order
- [ ] **Audit trail:** Often logs actions but not entity snapshots — verify rollback works after entity is modified externally
- [ ] **Rules engine:** Often executes rules but no conflict detection — verify multiple rules don't fight over same entity
- [ ] **Safety limits:** Often validates input but not cumulative changes — verify daily budget increase limit works across multiple actions
- [ ] **Campaign sync:** Often syncs active campaigns but ignores archived — verify archived campaigns don't break queries
- [ ] **Bulk actions:** Often work for 5 items but timeout at 50 — verify pagination and batching for large selections
- [ ] **Agent API:** Often implements happy path but not auth failures — verify API returns proper 401/403 with helpful messages
- [ ] **Rollback:** Often can roll back recent changes but fails on old ones — verify rollback works after 30+ days
- [ ] **Search terms:** Often fetches all search terms but doesn't handle >10k results — verify pagination on large keyword search term reports

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| OAuth tokens invalidated | LOW | 1. Re-authenticate via Amazon login flow 2. Tokens automatically stored 3. Resume operations |
| Rate limit suspension (temporary) | MEDIUM | 1. Wait for suspension to lift (1-24 hours) 2. Review logs for cause 3. Lower rate limit to 1 req/sec 4. Gradually increase after 48 hours |
| Rules engine cascade | MEDIUM | 1. Disable all rules immediately 2. Review audit log for affected entities 3. Rollback automated changes 4. Add cooldown logic 5. Re-enable rules one at a time |
| Stale data rollback | HIGH | 1. Sync latest data from Amazon API 2. Compare current state to intended rollback target 3. Calculate correct rollback value manually 4. Apply corrected rollback 5. Add warning to rollback UI |
| Audit trail data loss | HIGH | 1. Cannot recover historical audit data 2. Add forward-only note documenting gap 3. Implement complete snapshot storage going forward 4. Consider Amazon API change history as partial backup |
| API account suspension (permanent) | CRITICAL | 1. Contact Amazon Ads API support 2. Provide logs showing good-faith rate limiting attempt 3. May require new API credentials 4. Implement additional safeguards before re-enabling |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OAuth token refresh race | Phase 1 (OAuth) | Concurrent token refresh test, verify mutex prevents double refresh |
| Rate limit violations | Phase 2 (Sync) | Load test with 100-campaign mock account, verify rate limiter enforces 2 req/sec |
| Amazon API data model mismatch | Phase 2 (Sync) | Sync test account with SP+SB+SD campaigns, verify all types handled correctly |
| Stale data rollback | Phase 8 (Audit Trail) | Modify entity externally (via Amazon console), attempt rollback, verify diff shown |
| Rules cascade effects | Phase 6 (Rules Engine) | Create conflicting rules, verify cooldown prevents cascade |
| Incomplete audit snapshots | Phase 8 (Audit Trail) | Delete campaign, attempt rollback of old change, verify graceful failure |
| Performance (N+1 queries) | Phase 3 (Overview Dashboard) | Load 50+ campaigns, verify single query, measure <200ms load time |
| Performance (sync timeout) | Phase 2 (Sync) | Mock 200-campaign account, verify sync completes in <5 minutes with rate limiting |
| Bulk action timeout | Phase 5 (Keywords Bulk Actions) | Select 100 keywords, apply bulk action, verify batching prevents timeout |
| Agent API auth failure handling | Phase 10 (Agent REST API) | Test all API endpoints with missing/invalid API key, verify proper 401 response |

---

## Sources

**Confidence level: MEDIUM**

Unable to access web sources during research. Findings based on:
- Amazon Advertising API documentation patterns (from training data, pre-2025)
- Common PPC management system architecture knowledge
- OAuth2 best practices and known failure modes
- Rate limiting patterns for third-party APIs
- Project context provided (PROJECT.md risk areas)

**Verification needed:**
- Current Amazon Ads API rate limits (may have changed)
- @scaleleap/amazon-advertising-api-sdk token refresh implementation details
- Amazon Ads API campaign type schemas (SP/SB/SD differences)
- Amazon API timezone handling specifics

**Recommended:** Verify critical claims (rate limits, OAuth flow, campaign types) against official Amazon Advertising API documentation before roadmap finalization.

---
*Pitfalls research for: Amazon PPC Management Dashboard*
*Researched: 2026-02-04*
