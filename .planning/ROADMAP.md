# Roadmap: Evolance PPC Command Center

## Overview

This roadmap delivers a Next.js dashboard for Amazon PPC campaign management with AI agent integration. The journey starts with authentication and Amazon API connection, builds the data sync foundation, delivers manual campaign management UI, implements safety limits and audit logging, then enables AI agent automation through REST API and rules engine. Every phase builds on previous infrastructure, with safety and audit capabilities in place before any automation features.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Authentication** - Next.js setup, authentication, database schema
- [x] **Phase 2: Amazon API Connection** - OAuth2 flow, token management, rate limiting
- [x] **Phase 3: Data Sync & Storage** - Campaign/keyword sync from Amazon API to SQLite
- [x] **Phase 4: Dashboard UI** - Overview page, campaign list, date range selection
- [x] **Phase 5: Campaign & Keyword Management** - Inline editing, keyword views, search terms
- [x] **Phase 6: Safety & Audit Foundation** - Safety limits, audit logging with snapshots
- [x] **Phase 7: Agent Integration** - REST API, chat interface, agent actions
- [ ] **Phase 8: Rules & Reports** - Rules engine, analytics, rollback capability

## Phase Details

### Phase 1: Foundation & Authentication
**Goal**: User can access authenticated dashboard with working database
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can log in with password from PPC_DASHBOARD_PASSWORD env var
  2. User session persists across browser refresh
  3. User can log out from any page
  4. Unauthenticated users are redirected to login page
  5. Database schema is created and migrations run successfully
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Foundation setup (Next.js, Prisma, session config)
- [x] 01-02-PLAN.md — Auth system (middleware, login, logout)
- [x] 01-03-PLAN.md — Dashboard shell and verification

### Phase 2: Amazon API Connection
**Goal**: App can authenticate with Amazon Ads API and maintain valid tokens
**Depends on**: Phase 1
**Requirements**: AMZN-01, AMZN-02, AMZN-03, AMZN-04, AMZN-05, AMZN-06
**Success Criteria** (what must be TRUE):
  1. User can generate Amazon OAuth authorization URL from settings page
  2. User can paste auth code and app exchanges it for tokens within 5 minutes
  3. App automatically refreshes access token before expiry without race conditions
  4. User can view token health (last refresh, connection status) in settings
  5. User can select Amazon advertising profile after OAuth connection
  6. Rate limiter enforces 10 req/sec burst and 2 req/sec sustained limits
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Schema & SDK setup (AmazonCredential model, SDK install)
- [x] 02-02-PLAN.md — OAuth flow & settings page (auth URL, code exchange)
- [x] 02-03-PLAN.md — Token refresh & profile selection (mutex, health display)

### Phase 3: Data Sync & Storage
**Goal**: Dashboard displays current Amazon campaign data synced to local database
**Depends on**: Phase 2
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06
**Success Criteria** (what must be TRUE):
  1. App syncs SP campaigns, ad groups, keywords, and metrics from Amazon API
  2. App syncs SB and SD campaigns from Amazon API
  3. Sync respects Amazon API rate limits via token bucket queue
  4. User can trigger manual sync from dashboard with visible status
  5. Dashboard shows last sync timestamp and sync status
  6. Sync uses two-phase pattern (fetch then atomic persist) to handle failures gracefully
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Schema & models (Campaign, AdGroup, Keyword, Metric tables)
- [x] 03-02-PLAN.md — API fetchers (SP, SB, SD campaigns, ad groups, keywords)
- [x] 03-03-PLAN.md — Sync engine (two-phase pattern, atomic persist)
- [x] 03-04-PLAN.md — UI & trigger (Sync button, status display)

### Phase 4: Dashboard UI
**Goal**: User can view campaign performance and metrics in web dashboard
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, CAMP-01, CAMP-02, CAMP-03, CAMP-07
**Success Criteria** (what must be TRUE):
  1. Dashboard shows performance cards (spend, ACoS, ROAS, impressions, clicks, CTR, CPC, orders, sales) with 7d/30d trends
  2. Agent status indicator shows last heartbeat and last action
  3. Recent actions feed shows last 24 hours of activity
  4. Alerts section shows budget pacing warnings, high ACoS, paused campaigns
  5. Campaign table shows all campaigns (SP/SB/SD) with sortable columns and full metrics
  6. User can filter campaigns by type, status, performance range, date range
  7. Date range selector works across all pages (Today, 7d, 30d, 90d, Custom, Lifetime)
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md — Date range & metrics query (types, selector, aggregation)
- [x] 04-02-PLAN.md — Performance cards & alerts (MetricCard, dashboard update)
- [x] 04-03-PLAN.md — Campaign table (sortable columns, filters)

### Phase 5: Campaign & Keyword Management
**Goal**: User can manually manage campaigns and keywords with inline editing
**Depends on**: Phase 4
**Requirements**: CAMP-04, CAMP-05, CAMP-06, KWRD-01, KWRD-02, KWRD-03, KWRD-04, KWRD-05, KWRD-06
**Success Criteria** (what must be TRUE):
  1. User can inline edit campaign budget, bid, and status directly in campaign table
  2. User can drill down from campaign to ad groups to keywords with same metric columns
  3. User can create new SP campaign with name, ASIN, daily budget, targeting type, default bid
  4. User can view all keywords with full metrics (bid, impressions, clicks, spend, ACoS, ROAS, etc.)
  5. User can view search term report with suggested actions (add keyword, negate, ignore)
  6. User can perform bulk actions on keywords (add, remove, adjust bid, change status, add negative)
  7. User can filter keywords by campaign, ad group, match type, performance range
**Plans**: 3 plans (1 skipped - blocked on external dependencies)

Plans:
- [x] 05-01-PLAN.md — Campaign detail page with ad groups drill-down
- [x] 05-02-PLAN.md — Keywords page with filters and full metrics
- [x] 05-03-PLAN.md — SKIPPED (requires Amazon API write access)

### Phase 6: Safety & Audit Foundation
**Goal**: All actions are logged with full state snapshots and safety limits are enforced
**Depends on**: Phase 5
**Requirements**: SAFE-01, SAFE-02, SAFE-03, SAFE-04, SAFE-05, AUDT-01, AUDT-02, AUDT-03, AUDT-04, AUDT-07, SETT-02
**Success Criteria** (what must be TRUE):
  1. User can configure safety limits (max bid/budget change %, max daily spend, min bid floor) in settings
  2. All action endpoints (manual edits) enforce safety limits and reject violations with clear error messages
  3. Every action (bid change, keyword add, budget adjustment, pause, enable) is logged with timestamp
  4. Each audit entry captures complete before and after state as JSON snapshots
  5. Audit log is filterable by action type, date range, entity type
  6. User can view audit log with actor (user, agent, rule) and reason for each action
  7. Audit entries include enough context to understand what changed and why
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Database schema for SafetyLimit and AuditEntry
- [x] 06-02-PLAN.md — Safety limits configuration UI and validation service
- [x] 06-03-PLAN.md — Audit logging service and audit log viewer

### Phase 7: Agent Integration
**Goal**: External AI agent can read data, execute actions, and communicate via REST API
**Depends on**: Phase 6
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08, AGNT-09, AGNT-10, CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, SETT-01, SETT-04
**Success Criteria** (what must be TRUE):
  1. Agent authenticates via X-Agent-Key header (key managed in settings)
  2. Agent can read campaigns, keywords, search terms, metrics, and rules via GET endpoints
  3. Agent can execute actions (adjust bid/budget, pause, enable, add keyword, negate) via POST endpoints
  4. All agent actions respect safety limits and are logged to audit trail automatically
  5. Agent can post and read chat messages via API
  6. User can send messages to agent and approve/reject proposed actions in chat interface
  7. Agent can trigger data sync and register heartbeat
  8. All API responses use consistent JSON format with data, meta, error fields
  9. Settings page allows user to generate, rotate, and revoke agent API keys
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md — API key management and auth middleware
- [x] 07-02-PLAN.md — Agent read API endpoints (campaigns, keywords, metrics)
- [x] 07-03-PLAN.md — Agent action endpoints with safety limits
- [x] 07-04-PLAN.md — Chat messages and UI

### Phase 8: Rules & Reports
**Goal**: User can automate decisions with rules engine and analyze performance with reports
**Depends on**: Phase 7
**Requirements**: RULE-01, RULE-02, RULE-03, RULE-04, RULE-05, RULE-06, RULE-07, REPT-01, REPT-02, REPT-03, REPT-04, REPT-05, AUDT-05, AUDT-06, SETT-03
**Success Criteria** (what must be TRUE):
  1. User can create automation rules with IF condition THEN action format
  2. User can toggle rules on/off and view execution history
  3. Rules engine enforces cooldown periods to prevent cascade effects
  4. Rules respect safety limits and are logged to audit trail
  5. App provides preset rule templates (reduce bid on high ACoS, negate non-converting terms)
  6. Trend charts show performance over selected date range with comparison to previous period
  7. User can view P&L (revenue vs ad spend), search term analysis, campaign comparison
  8. User can export all reports as CSV
  9. User can rollback any action with sync check and 3-way diff if current state differs
  10. Settings page manages notification config (which events trigger external alerts)
**Plans**: TBD

Plans:
- [ ] TBD (created during plan-phase)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 3/3 | Complete ✓ | 2026-02-05 |
| 2. Amazon API Connection | 3/3 | Complete ✓ | 2026-02-05 |
| 3. Data Sync & Storage | 4/4 | Complete ✓ | 2026-02-05 |
| 4. Dashboard UI | 3/3 | Complete ✓ | 2026-02-05 |
| 5. Campaign & Keyword Management | 2/3 | Complete ✓ | 2026-02-04 |
| 6. Safety & Audit Foundation | 3/3 | Complete ✓ | 2026-02-04 |
| 7. Agent Integration | 4/4 | Complete ✓ | 2026-02-04 |
| 8. Rules & Reports | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-04*
*Last updated: 2026-02-05*
