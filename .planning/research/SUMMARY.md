# Project Research Summary

**Project:** Amazon PPC Management Dashboard
**Domain:** Amazon Advertising / PPC Campaign Management
**Researched:** 2026-02-04
**Confidence:** MEDIUM

## Executive Summary

This is an Amazon PPC (pay-per-click) management dashboard designed to enable AI-powered campaign optimization through a REST API. The core innovation is providing a full audit trail and safety-limited API for external AI agents to read campaign data and propose/execute changes, while maintaining human oversight through an approval workflow. Based on research, the recommended approach is to build a Next.js 14 App Router application with SQLite database, using established patterns for rate-limited Amazon Ads API integration, audit logging, and safety enforcement.

The critical success factors are: (1) implementing robust rate limiting from day one to avoid Amazon API suspension, (2) building comprehensive audit logging with rollback capability to enable trust in automation, and (3) enforcing safety limits on all bid/budget changes before enabling AI agent or rules engine features. The architecture should separate concerns clearly: data sync layer (Amazon API → local DB), business logic layer (rules engine, audit service, safety validator), and presentation layer (dashboard UI + agent REST API).

Key risks include OAuth token refresh race conditions, Amazon API rate limit violations leading to account suspension, stale data making rollback dangerous, rules engine cascade effects, and incomplete audit trails. All of these can be mitigated through proper architecture patterns: mutex-protected token refresh, token bucket rate limiting, sync-before-rollback with 3-way diff, rule cooldown periods, and full entity snapshots in audit logs.

## Key Findings

### Recommended Stack

The project has core technologies already decided (Next.js 14 with App Router, Tailwind CSS, shadcn/ui, Prisma with SQLite, @scaleleap/amazon-advertising-api-sdk, Recharts/Tremor). Research identified complementary technologies needed to complete the stack.

**Core technologies:**
- **iron-session + bcryptjs**: Simple session-based authentication — lightweight, works natively with App Router, no database needed for single-user auth
- **react-hook-form + zod**: Form handling and validation — de facto standard for shadcn/ui, TypeScript-first validation, minimal re-renders
- **axios + p-queue**: HTTP client with request queueing — critical for respecting Amazon's 10 req/sec burst and 2 req/sec sustained rate limits
- **zustand + swr**: Client state management and server state caching — standard pattern for Next.js dashboards, swr provides stale-while-revalidate for polling
- **date-fns**: Date manipulation — essential for date range pickers and metric aggregations
- **vitest + Playwright**: Testing stack — faster than Jest, native ESM support, critical for audit trail and safety enforcement testing

**Key stack recommendations:**
- Separate client state (zustand) from server state (swr) — don't mix concerns
- Use async-mutex for sync job locking to prevent overlapping syncs
- Consider external cron over node-cron since constraints mention "handled externally"
- Avoid moment.js (deprecated), JWT libraries (unnecessary), Redux (overkill)

**Confidence:** HIGH for forms/auth/rate limiting patterns; MEDIUM for testing stack compatibility with App Router

### Expected Features

Research identified clear table stakes vs differentiators in the Amazon PPC management space.

**Must have (table stakes):**
- Campaign performance dashboard with standard metrics (spend, sales, ACoS, impressions, clicks)
- Campaign list view with sortable metrics and inline budget/status editing
- Keyword performance view with pause/enable actions
- Date range selection with standard presets
- Amazon API OAuth connection with token refresh
- Campaign data sync (scheduled + manual)
- Basic audit log (who/what/when)
- Simple password authentication

**Should have (competitive advantage):**
- AI Agent REST API with read/write endpoints — core differentiator enabling external agent integration
- Agent chat interface with action approval workflow — transparent automation vs competitor black boxes
- Full audit trail with rollback capability — rare in competitors, builds trust
- Safety limits configuration — max bid change %, daily spend caps, min bid floor
- Visual rules engine — common in tools like Helium 10/Perpetua
- Search term report with keyword harvesting workflow
- Negative keyword discovery automation

**Defer (v2+):**
- P&L view with COGS/fee attribution — complex, advanced use case
- Dayparting / schedule-based bid adjustments
- Cross-campaign portfolio analytics
- PDF export (CSV is sufficient initially)
- Multi-user/team features — violates single-user constraint

**Anti-features to avoid:**
- Real-time WebSocket updates — API rate limits make this impractical, polling every 5-15 min is sufficient
- Built-in AI agent logic — tight coupling prevents iteration, use external agent via REST API
- Automatic bidding without approval — trust issue, runaway spend risk
- Mobile app — desktop is primary use case, mobile optimization is low ROI
- Custom metric builder — rarely used, adds UX complexity

### Architecture Approach

Standard three-layer architecture: presentation layer (Next.js pages + shadcn/ui components), API layer (route handlers with auth middleware), and business logic layer (Amazon API service, rules engine, audit service) over data layer (Prisma + SQLite + Amazon Ads API).

**Major components:**
1. **Rate-Limited Amazon API Client** — wraps @scaleleap/amazon-advertising-api-sdk with p-queue token bucket limiter, enforces 10 req/sec burst and 2 req/sec sustained limits globally
2. **Two-Phase Sync Service** — separates API fetching (phase 1, retryable) from database persistence (phase 2, atomic transaction) for graceful failure handling
3. **Audit-Wrapped State Mutations** — captures before/after snapshots automatically on all state changes, enables rollback and debugging
4. **Safety-Checked Action Executor** — validates all bid/budget changes against configurable limits before execution, blocks agent and rules actions that exceed thresholds
5. **Agent REST API with Standard Format** — consistent `{ data, meta, error }` structure for all endpoints, API key auth separate from dashboard session auth

**Key architectural patterns:**
- **Pattern 1 (Rate Limiting)**: Token bucket with queue, all Amazon API calls funnel through single point
- **Pattern 2 (Audit Trail)**: Wrapper function captures before/after for all updates, stores JSON snapshots
- **Pattern 3 (Sync)**: Fetch all data first (handle retries), then persist atomically (rollback on failure)
- **Pattern 4 (Safety)**: Validate percent change + absolute max before allowing any bid/budget modification
- **Pattern 5 (Agent API)**: Standard response format with metadata, versioning, pagination support

**Recommended project structure:**
- `app/(dashboard)/` — authenticated dashboard pages with shared layout
- `app/api/agent/` — external agent REST API namespace
- `lib/amazon/` — Amazon API integration (client, OAuth, sync)
- `lib/rules/` — rules engine (evaluator, executor, parser)
- `lib/audit/` — audit trail (logger, rollback, diff)
- `lib/rate-limiter/` — rate limiting shared service

### Critical Pitfalls

Research identified six critical pitfalls that can break the product if not addressed in architecture from day one.

1. **OAuth2 Token Refresh Race Conditions** — Multiple concurrent API calls trigger simultaneous token refresh, invalidating each other and breaking authentication completely. Prevention: application-level mutex around token refresh, store tokens in database with updatedAt timestamp, retry logic for 401s, monitor consecutive refresh failures.

2. **Amazon API Rate Limit Violations** — Exceeding 10 req/sec burst or 2 req/sec sustained leads to account suspension (hours to permanent). Prevention: token bucket rate limiter with 2 req/sec sustained rate, request queue with concurrency control, circuit breaker after 3 consecutive 429s, test with 100+ campaign mock data.

3. **Stale Data Making Rollback Dangerous** — User rolls back a change but external modifications (from Amazon Ads console) have occurred, rollback overwrites external change without warning. Prevention: sync entity before rollback, show 3-way diff (your change vs current vs rollback target), require confirmation if current ≠ expected, use optimistic locking WHERE clause.

4. **Rules Engine Cascade Effects** — Multiple rules target same entity with conflicting logic, creating oscillating bid changes that never stabilize. Prevention: add "last modified by rule" timestamp, enforce 24-hour cooldown between rule executions on same entity, conflict detection warns when rules overlap, dry-run simulation mode required for new rules.

5. **Incomplete Audit Trail Missing Critical State** — Audit log stores only changed fields, not full snapshot, causing rollback failures when entity is deleted/moved. Prevention: store complete before/after JSON snapshots including parent relationships, denormalize display fields (campaign name), validate rollback target still exists, graceful failure if entity deleted.

6. **Amazon API Data Model Mismatches** — Sponsored Products, Sponsored Brands, and Sponsored Display have different schemas; modeling everything as "Campaign → Keyword" breaks on SB/SD campaigns. Prevention: add campaignType enum, model targeting separately per type (Keyword for SP, Product for SB, Audience for SD), type-specific sync handlers.

## Implications for Roadmap

Based on research, suggested phase structure that follows natural dependencies and mitigates critical pitfalls:

### Phase 1: Foundation (OAuth + Rate Limiting)
**Rationale:** Amazon API connection is a prerequisite for everything. Must implement rate limiting and token refresh with mutex from day one — cannot retrofit later without touching 50+ call sites.
**Delivers:** Working Amazon OAuth2 flow, token storage in database, rate limiter with queue, token refresh with race condition protection
**Addresses:** Pitfall #1 (OAuth race conditions), Pitfall #2 (rate limits)
**Uses:** iron-session for session management, axios + p-queue for rate limiting, async-mutex for token refresh lock
**Research flag:** Skip research — OAuth2 and rate limiting are well-documented patterns

### Phase 2: Data Sync (Two-Phase Pattern)
**Rationale:** Dashboard cannot display anything without local data. Sync must handle all three campaign types (SP/SB/SD) from start to avoid migration later.
**Delivers:** Background sync service for campaigns/ad groups/keywords/metrics, two-phase atomic sync, sync history tracking, manual sync trigger
**Addresses:** Pitfall #6 (data model mismatches), Performance trap (N+1 queries)
**Uses:** Prisma transactions, campaign type discriminator, incremental sync with timestamps
**Research flag:** Phase needs deeper research — verify Amazon API campaign type schemas, confirm @scaleleap SDK support for all types

### Phase 3: Dashboard UI (Overview + Campaign List)
**Rationale:** Validate data model and sync logic with human testing before enabling automation. Provides manual campaign management value immediately.
**Delivers:** Dashboard layout with navigation, overview page with performance cards, campaign list with inline editing, date range selection
**Addresses:** Table stakes features (campaign dashboard, campaign list view, date range selection)
**Uses:** shadcn/ui components, swr for data fetching, zustand for UI state (date range, filters), react-hook-form + zod for inline editing
**Research flag:** Skip research — standard dashboard patterns, well-documented

### Phase 4: Safety Limits + Basic Audit Log
**Rationale:** Automation features (agent API, rules engine) should not be built until safety enforcement exists. Audit log must be comprehensive from start — cannot bolt on snapshots later.
**Delivers:** Safety limits configuration UI, validation functions for bid/budget changes, audit log with full JSON snapshots (before/after), audit trail viewer (read-only)
**Addresses:** Pitfall #5 (incomplete audit trail), prerequisite for Phase 6 (agent API) and Phase 7 (rules)
**Uses:** Zod schemas for safety validation, Prisma for audit storage, JSON columns for snapshots
**Research flag:** Skip research — audit logging is standard pattern

### Phase 5: Keyword Management + Search Terms
**Rationale:** Keyword optimization is the primary use case for PPC management. Search terms enable keyword harvesting workflow.
**Delivers:** Keyword performance view with metrics, keyword status toggles (pause/enable), search term report, keyword harvesting workflow
**Addresses:** Table stakes features (keyword performance view, search term report)
**Uses:** Bulk action patterns, pagination for large search term reports
**Research flag:** Phase needs research — verify Amazon Search Term API limits and pagination, confirm harvesting workflow best practices

### Phase 6: Agent REST API (Read/Write)
**Rationale:** Core differentiator — enables external AI agent integration. Depends on safety limits (Phase 4) and audit trail existing first.
**Delivers:** Agent API authentication (API key), read endpoints (campaigns, keywords, metrics), action endpoints (update bid/budget, pause/enable), standard response format, action approval workflow
**Addresses:** Differentiator features (AI agent API integration, agent chat interface)
**Uses:** API key auth separate from dashboard session, safety validator wraps all actions, audit logger captures agentId context
**Research flag:** Skip research — REST API patterns are well-established, focus on clear documentation for external agent

### Phase 7: Rules Engine (Basic)
**Rationale:** Provides automation beyond agent actions. Must implement cooldown and conflict detection from start to avoid cascade issues (Pitfall #4).
**Delivers:** Rule data model, condition evaluator, action executor with safety checks, cooldown enforcement, rule execution history, rules UI (list/create/edit)
**Addresses:** Differentiator features (visual rules engine — deferred to v2, text-based rules in v1)
**Uses:** Rules engine patterns, dry-run mode for testing, execution logs
**Research flag:** Phase needs research — verify rule DSL design, review Helium 10/Perpetua rule patterns for inspiration

### Phase 8: Audit Trail Rollback
**Rationale:** Enables trust in automation. Must implement sync-before-rollback and 3-way diff to avoid stale data issues (Pitfall #3).
**Delivers:** Rollback functionality with current state sync, 3-way diff UI, rollback confirmation dialog, rollback audit logging
**Addresses:** Differentiator features (full audit trail with rollback)
**Uses:** Amazon API sync for current state, diff calculator, optimistic locking WHERE clause
**Research flag:** Skip research — rollback patterns are known, focus on UX for diff display

### Phase Ordering Rationale

- **Foundation first:** OAuth + rate limiting cannot be added later — all API calls depend on this infrastructure
- **Data before UI:** Sync must work to populate database before dashboard can display anything
- **Safety before automation:** Agent API and rules engine should not exist until safety limits are enforced
- **Manual before automated:** Dashboard validates data model and business logic with human testing before enabling automation
- **Read before write:** Agent API read endpoints (Phase 6) inform action endpoint design
- **Basic rules before visual builder:** Text-based rules in v1, visual builder deferred to v2+ after validation

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Data Sync):** Amazon API campaign type schemas (SP vs SB vs SD differences), @scaleleap SDK support verification, timezone handling specifics
- **Phase 5 (Keywords + Search Terms):** Search Term API rate limits and pagination, keyword harvesting workflow best practices from competitor tools
- **Phase 7 (Rules Engine):** Rule DSL design decisions, review Helium 10/Perpetua rule patterns, conflict detection algorithms

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** OAuth2 and rate limiting are well-documented patterns with established libraries
- **Phase 3 (Dashboard UI):** Standard dashboard patterns, shadcn/ui has comprehensive documentation
- **Phase 4 (Safety + Audit):** Audit logging and validation are known patterns
- **Phase 6 (Agent REST API):** REST API patterns are well-established, focus on documentation
- **Phase 8 (Rollback):** Rollback patterns are known, focus on UX implementation

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Forms/auth/rate limiting patterns are HIGH confidence; testing stack compatibility with Next.js 14 App Router is MEDIUM; specific package versions are LOW (cannot verify latest) |
| Features | MEDIUM | Table stakes features are HIGH confidence based on competitor tools; differentiators are MEDIUM confidence based on training data about PPC management space |
| Architecture | MEDIUM | Rate limiting, audit trail, and safety patterns are HIGH confidence; specific Next.js App Router patterns are MEDIUM (based on Jan 2025 knowledge cutoff) |
| Pitfalls | MEDIUM | OAuth race conditions and rate limiting are HIGH confidence (common across all API integrations); domain-specific pitfalls are MEDIUM (based on Amazon Ads API patterns) |

**Overall confidence:** MEDIUM

### Gaps to Address

Research was unable to verify with external sources due to tool access limitations. Key gaps to validate during implementation:

- **Amazon Ads API specifics:** Current rate limits (verify 10 req/sec burst, 2 req/sec sustained), campaign type schemas (SP/SB/SD differences), search term API pagination limits, timezone handling requirements
- **@scaleleap/amazon-advertising-api-sdk:** Token refresh implementation details, OAuth2 flow support, campaign type handling, automatic retry logic
- **Next.js 14 App Router compatibility:** Verify swr, zustand, vitest work correctly with React Server Components, confirm iron-session v8 works with App Router cookies API
- **shadcn/ui setup:** Follow official installation guide for exact dependencies and configuration
- **Exact package versions:** Check npm for latest stable versions before installation

**How to handle gaps:**
- Phase 1-2: Consult official Amazon Advertising API documentation for rate limits and schemas
- Phase 1: Review @scaleleap/amazon-advertising-api-sdk GitHub repository and examples
- All phases: Follow Next.js 14 official documentation for App Router patterns
- Phase 3: Follow shadcn/ui official setup guide precisely

## Sources

### Primary (MEDIUM confidence)
- PROJECT.md — project requirements, constraints, already-decided stack
- Training data on Amazon Advertising API patterns (knowledge cutoff January 2025)
- Training data on competitor PPC management tools (Helium 10, Perpetua, Teikametrics, Jungle Scout)
- Next.js 14 App Router architecture patterns (official Next.js documentation as of training cutoff)

### Secondary (MEDIUM confidence)
- Common OAuth2 implementation patterns and failure modes
- Standard rate limiting algorithms (token bucket, sliding window)
- PPC management workflow best practices
- React/TypeScript ecosystem patterns

### Tertiary (LOW confidence — needs validation)
- Specific Amazon Ads API rate limits (verify at advertising.amazon.com/API/docs)
- @scaleleap/amazon-advertising-api-sdk current API (check GitHub repo)
- shadcn/ui recommended dependencies (verify at ui.shadcn.com/docs)
- Latest package versions for dependencies (check npm)

**Verification needed:** All Amazon Ads API specifics, @scaleleap SDK capabilities, Next.js 14 App Router edge cases, shadcn/ui setup requirements

---
*Research completed: 2026-02-04*
*Ready for roadmap: Yes*
