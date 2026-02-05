# Requirements: Evolance PPC Command Center

**Defined:** 2026-02-04
**Core Value:** The REST API and audit trail must work flawlessly — they are the foundation the AI agent plugs into, and every action must be traceable and reversible.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can log in with password set via PPC_DASHBOARD_PASSWORD env var
- [x] **AUTH-02**: User session persists across browser refresh (iron-session cookie)
- [x] **AUTH-03**: User can log out from any page
- [x] **AUTH-04**: Unauthenticated users are redirected to login page

### Amazon API Connection

- [ ] **AMZN-01**: User can generate Amazon OAuth authorization URL from settings page
- [ ] **AMZN-02**: User can paste auth code and app exchanges it for access + refresh tokens within 5 minutes
- [ ] **AMZN-03**: App automatically refreshes access token before expiry with mutex to prevent race conditions
- [ ] **AMZN-04**: User can view token health (last refresh, connection status, connected profile) in settings
- [ ] **AMZN-05**: User can select Amazon advertising profile after OAuth connection
- [ ] **AMZN-06**: Tokens are stored in database (not .env) and updated on each refresh

### Data Sync

- [ ] **SYNC-01**: App syncs SP campaigns, ad groups, keywords, and metrics from Amazon API
- [ ] **SYNC-02**: App syncs SB and SD campaigns from Amazon API
- [ ] **SYNC-03**: Sync respects Amazon API rate limits (10 req/sec burst, 2 req/sec sustained) via token bucket queue
- [ ] **SYNC-04**: User can trigger manual sync from dashboard
- [ ] **SYNC-05**: Dashboard shows last sync timestamp and sync status
- [ ] **SYNC-06**: Sync uses two-phase pattern (fetch then atomic persist) to handle partial failures

### Overview Dashboard

- [ ] **DASH-01**: Dashboard shows performance cards: spend, ACoS, ROAS, impressions, clicks, CTR, CPC, orders, sales
- [ ] **DASH-02**: Performance cards show today + 7d/30d trends with % change
- [ ] **DASH-03**: Agent status indicator shows last heartbeat, last action, current state
- [ ] **DASH-04**: Recent actions feed shows last 24 hours of agent activity
- [ ] **DASH-05**: Alerts section shows budget pacing warnings, high ACoS, paused campaigns
- [ ] **DASH-06**: Top/worst performers section shows best and worst campaigns and keywords by ACoS/ROAS

### Campaign Management

- [ ] **CAMP-01**: User can view all campaigns (SP/SB/SD) in sortable, filterable table with full metrics
- [ ] **CAMP-02**: Campaign table shows: name, type, status, daily budget, impressions, clicks, CTR, spend, CPC, orders, sales, ACoS, ROAS, top of search %
- [ ] **CAMP-03**: User can filter campaigns by type (SP/SB/SD), status, performance range, date range
- [ ] **CAMP-04**: User can inline edit campaign budget, bid, and status directly in table
- [ ] **CAMP-05**: User can drill down from campaign to ad groups to keywords with same metric columns
- [ ] **CAMP-06**: User can create new SP campaign with name, ASIN, daily budget, targeting type (auto/manual), default bid
- [ ] **CAMP-07**: Date range selector available on all pages: Today, Yesterday, 7d, 30d, 90d, Custom, Lifetime

### Keywords & Targeting

- [ ] **KWRD-01**: User can view all keywords with bid, impressions, clicks, spend, ACoS, orders, sales, ROAS, CPC, CTR, status, match type
- [ ] **KWRD-02**: User can view search term report showing what customers searched with impressions, clicks, spend, orders, sales, ACoS, ROAS
- [ ] **KWRD-03**: Search term report shows suggested actions (add as keyword, negate, ignore) based on rules engine
- [ ] **KWRD-04**: User can perform bulk actions on multiple keywords (add, remove, adjust bid, change status)
- [ ] **KWRD-05**: User can add negative keywords to campaigns
- [ ] **KWRD-06**: User can filter keywords by campaign, ad group, match type, performance range

### Rules Engine

- [ ] **RULE-01**: User can create automation rules with IF condition THEN action format
- [ ] **RULE-02**: User can toggle rules on/off
- [ ] **RULE-03**: User can view rule execution history showing when each rule fired, what it did, before/after state
- [ ] **RULE-04**: App provides preset rule templates (e.g., "Reduce bid on high ACoS keywords", "Negate non-converting search terms")
- [ ] **RULE-05**: User can build rules with visual editor (drag-drop condition/action builder)
- [ ] **RULE-06**: Rules engine enforces cooldown periods to prevent cascade effects from conflicting rules
- [ ] **RULE-07**: Rules respect safety limits on all actions

### Safety Limits

- [ ] **SAFE-01**: User can configure max bid change % in settings
- [ ] **SAFE-02**: User can configure max budget change % in settings
- [ ] **SAFE-03**: User can configure absolute max daily spend in settings
- [ ] **SAFE-04**: User can configure minimum bid floor in settings
- [ ] **SAFE-05**: All action endpoints (manual, rules, agent) enforce safety limits and reject violations with clear error message

### Agent Chat

- [ ] **CHAT-01**: User can send natural language messages to agent via chat interface
- [ ] **CHAT-02**: Agent messages appear in chat with timestamps
- [ ] **CHAT-03**: Actions proposed by agent are shown as approval cards with approve/reject buttons
- [ ] **CHAT-04**: Message history is stored in database with full context
- [ ] **CHAT-05**: Chat interface is the primary control surface for agent interaction

### Agent REST API

- [ ] **AGNT-01**: Agent authenticates via X-Agent-Key header (key managed in settings)
- [ ] **AGNT-02**: Agent can read campaigns, keywords, search terms, metrics, and rules via GET endpoints
- [ ] **AGNT-03**: Agent can execute actions (adjust bid, adjust budget, pause, enable, add keyword, negate keyword) via POST endpoints
- [ ] **AGNT-04**: Agent can post and read chat messages via API
- [ ] **AGNT-05**: Agent can view and submit approvals for pending actions
- [ ] **AGNT-06**: Agent can read audit log and trigger rollbacks via API
- [ ] **AGNT-07**: Agent can register heartbeat and trigger data sync
- [ ] **AGNT-08**: Agent can trigger rule evaluation cycle
- [ ] **AGNT-09**: All API responses use consistent JSON format { data, meta, error }
- [ ] **AGNT-10**: All agent actions are logged to audit trail automatically

### Reports & Analytics

- [ ] **REPT-01**: Trend charts show performance over selected date range with comparison to previous period
- [ ] **REPT-02**: P&L view shows revenue vs ad spend and net margin
- [ ] **REPT-03**: Search term analysis shows top converting terms, top spending terms, opportunities
- [ ] **REPT-04**: Campaign comparison allows side-by-side performance of multiple campaigns
- [ ] **REPT-05**: User can export all reports as CSV

### Audit Log

- [ ] **AUDT-01**: Every action (bid change, keyword add, budget adjustment, pause, enable) is logged with timestamp
- [ ] **AUDT-02**: Each audit entry captures complete before and after state as JSON snapshots
- [ ] **AUDT-03**: Audit log is filterable by action type, date range, entity type
- [ ] **AUDT-04**: User can rollback any action to its before state with one click
- [ ] **AUDT-05**: Rollback performs sync check and shows diff if current state differs from expected after state
- [ ] **AUDT-06**: User can export full audit trail
- [ ] **AUDT-07**: Audit entries include actor (user, agent, rule) and reason when available

### Settings

- [ ] **SETT-01**: Settings page manages Amazon API connection (OAuth flow, token health, profile selection)
- [ ] **SETT-02**: Settings page manages safety limits (bid/budget change %, max daily spend, min bid floor)
- [ ] **SETT-03**: Settings page manages notification config (which events trigger external alerts, stored in DB)
- [ ] **SETT-04**: Settings page manages agent API key (generate, rotate, revoke)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reporting

- **REPT-06**: PDF export for all reports

### Advanced Automation

- **RULE-08**: Dayparting / schedule-based rules (adjust bids by time of day)
- **RULE-09**: Dry-run mode for new rules (simulate 7-day execution without applying)

### Bulk Operations

- **BULK-01**: Dedicated bulk edit interface with multi-select, batch operations, preview before apply

### Advanced Analytics

- **ANLZ-01**: Cross-campaign analytics and benchmarking
- **ANLZ-02**: Custom metric builder for user-defined formulas

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI agent implementation | Built separately, connects via REST API |
| Cron scheduling | Handled externally, app exposes sync endpoint |
| Messaging integrations (Slack, email) | Handled externally, app stores notification config |
| Multi-user / multi-account | Single user, single Amazon account — complexity not justified |
| Mobile app | Web only, desktop-first |
| Real-time WebSocket updates | Polling sufficient for v1, Amazon data doesn't change second-to-second |
| PDF export | CSV sufficient for v1, PDF adds layout complexity |
| Built-in inventory management | External systems handle this, out of PPC scope |
| Social media ad integration | Specialize in Amazon PPC |
| OAuth/SSO for dashboard | Single password auth sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AMZN-01 | Phase 2 | Pending |
| AMZN-02 | Phase 2 | Pending |
| AMZN-03 | Phase 2 | Pending |
| AMZN-04 | Phase 2 | Pending |
| AMZN-05 | Phase 2 | Pending |
| AMZN-06 | Phase 2 | Pending |
| SYNC-01 | Phase 3 | Pending |
| SYNC-02 | Phase 3 | Pending |
| SYNC-03 | Phase 3 | Pending |
| SYNC-04 | Phase 3 | Pending |
| SYNC-05 | Phase 3 | Pending |
| SYNC-06 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| DASH-06 | Phase 4 | Pending |
| CAMP-01 | Phase 4 | Pending |
| CAMP-02 | Phase 4 | Pending |
| CAMP-03 | Phase 4 | Pending |
| CAMP-04 | Phase 5 | Pending |
| CAMP-05 | Phase 5 | Pending |
| CAMP-06 | Phase 5 | Pending |
| CAMP-07 | Phase 4 | Pending |
| KWRD-01 | Phase 5 | Pending |
| KWRD-02 | Phase 5 | Pending |
| KWRD-03 | Phase 5 | Pending |
| KWRD-04 | Phase 5 | Pending |
| KWRD-05 | Phase 5 | Pending |
| KWRD-06 | Phase 5 | Pending |
| RULE-01 | Phase 8 | Pending |
| RULE-02 | Phase 8 | Pending |
| RULE-03 | Phase 8 | Pending |
| RULE-04 | Phase 8 | Pending |
| RULE-05 | Phase 8 | Pending |
| RULE-06 | Phase 8 | Pending |
| RULE-07 | Phase 8 | Pending |
| SAFE-01 | Phase 6 | Pending |
| SAFE-02 | Phase 6 | Pending |
| SAFE-03 | Phase 6 | Pending |
| SAFE-04 | Phase 6 | Pending |
| SAFE-05 | Phase 6 | Pending |
| CHAT-01 | Phase 7 | Pending |
| CHAT-02 | Phase 7 | Pending |
| CHAT-03 | Phase 7 | Pending |
| CHAT-04 | Phase 7 | Pending |
| CHAT-05 | Phase 7 | Pending |
| AGNT-01 | Phase 7 | Pending |
| AGNT-02 | Phase 7 | Pending |
| AGNT-03 | Phase 7 | Pending |
| AGNT-04 | Phase 7 | Pending |
| AGNT-05 | Phase 7 | Pending |
| AGNT-06 | Phase 7 | Pending |
| AGNT-07 | Phase 7 | Pending |
| AGNT-08 | Phase 7 | Pending |
| AGNT-09 | Phase 7 | Pending |
| AGNT-10 | Phase 7 | Pending |
| REPT-01 | Phase 8 | Pending |
| REPT-02 | Phase 8 | Pending |
| REPT-03 | Phase 8 | Pending |
| REPT-04 | Phase 8 | Pending |
| REPT-05 | Phase 8 | Pending |
| AUDT-01 | Phase 6 | Pending |
| AUDT-02 | Phase 6 | Pending |
| AUDT-03 | Phase 6 | Pending |
| AUDT-04 | Phase 6 | Pending |
| AUDT-05 | Phase 8 | Pending |
| AUDT-06 | Phase 8 | Pending |
| AUDT-07 | Phase 6 | Pending |
| SETT-01 | Phase 7 | Pending |
| SETT-02 | Phase 6 | Pending |
| SETT-03 | Phase 8 | Pending |
| SETT-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after roadmap creation*
