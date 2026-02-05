# Feature Research: Amazon PPC Management Dashboard

**Domain:** Amazon PPC Advertising Management
**Researched:** 2026-02-04
**Confidence:** MEDIUM (based on training data about Amazon Advertising ecosystem, PPC management tools like Helium 10, Perpetua, Teikametrics, Jungle Scout; unable to verify with current external sources)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Campaign Performance Dashboard | Core purpose of any PPC tool — see what's working | MEDIUM | Requires API sync, metric aggregation, time-based filtering. Cards for spend, sales, ACoS, impressions, clicks, conversions |
| Campaign List View | Need to see all campaigns with key metrics at a glance | MEDIUM | Sortable table, filtering by status/type, inline editing of budget/status is highly expected |
| Keyword Performance View | Keywords are the core optimization unit in PPC | MEDIUM | List with metrics (impressions, clicks, spend, sales, ACoS), filtering, search term report integration |
| Date Range Selection | Historical comparison is essential for optimization | LOW | Standard date picker with presets (today, yesterday, last 7d, 30d, custom) |
| Budget & Bid Editing | Primary action users take daily | MEDIUM | Inline editing with validation, batch updates, undo capability expected |
| Keyword Status Management | Pause/enable keywords based on performance | LOW | Bulk actions, status toggles, confirmation before executing |
| Search Term Report | See actual customer queries triggering ads | HIGH | Requires Search Term API, harvesting to add as keywords, negative keyword addition |
| Basic Filtering & Sorting | Find underperformers quickly | LOW | Filter by metric thresholds (ACoS > X, spend > Y), multi-column sort |
| Campaign/Ad Group Drill-Down | Hierarchy navigation (Campaign → Ad Group → Keywords) | MEDIUM | Breadcrumb navigation, contextual metrics at each level |
| Ad Group Management | Organize keywords, set ad group bids | MEDIUM | CRUD operations, bid editing, keyword assignment |
| Amazon API OAuth Connection | Users expect seamless API integration | HIGH | OAuth2 auth code flow, token refresh, profile selection, credential storage |
| Data Sync/Refresh | Get latest data from Amazon | MEDIUM | Scheduled sync + manual refresh button, last sync timestamp display, rate limiting |
| Metric Calculations | Standard PPC metrics (ACoS, RoAS, CTR, CVR, CPC) | LOW | Derived from API data: ACoS = spend/sales, RoAS = sales/spend, etc. |
| Status Indicators | Visual campaign/keyword health (Active, Paused, Archived) | LOW | Color coding, icon badges |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI Agent API Integration | Let AI autonomously manage campaigns via REST API | HIGH | The core differentiator per PROJECT.md. Requires well-designed REST endpoints, safety limits, approval workflow |
| Agent Chat Interface | Natural language interaction with AI for campaign questions/actions | MEDIUM | Chat UI with agent messages, action approval cards, conversation history |
| Full Audit Trail with Rollback | Every change is logged and reversible | MEDIUM | Critical for trust when AI makes changes. Capture before/after state, allow one-click rollback |
| Visual Rules Engine | Build automation rules with drag-drop builder | HIGH | Triggers (metric thresholds, schedule), conditions (AND/OR), actions (pause, adjust bid), templates library |
| Safety Limits Enforcement | Prevent runaway spend from automation | MEDIUM | Global limits: max bid/budget change %, absolute daily spend cap, min bid floor. Applied to all API actions |
| Bid Optimization Suggestions | Proactive recommendations for bid adjustments | MEDIUM | Analyze performance trends, suggest bid increases for winners, decreases for losers |
| P&L View with Cost Attribution | True profitability including COGS, fees | HIGH | Requires product cost data, Amazon fee calculations, attribution models. Most tools skip this |
| Negative Keyword Discovery | Auto-suggest negative keywords from poor performers | MEDIUM | Analyze search terms with high spend, low conversions. Generate negative keyword candidates |
| Dayparting / Schedule-Based Rules | Adjust bids by time of day or day of week | MEDIUM | Requires scheduled rule execution, time-zone handling |
| Budget Pacing Alerts | Warn when daily budget will be exhausted early | LOW | Calculate current spend rate vs time remaining in day |
| Cross-Campaign Analytics | Compare performance across portfolios | MEDIUM | Aggregate metrics across campaigns, identify trends, benchmark against averages |
| Keyword Harvesting Workflow | Structured process to move search terms to keywords | MEDIUM | Review search terms → select winners → add as keywords with recommended bid |
| Export to CSV/PDF | Share reports with stakeholders | LOW | Generate reports from current view, format as CSV or PDF |
| Bulk Edit Interface | Change multiple campaigns/keywords at once | MEDIUM | Multi-select, batch operations, preview changes before applying |
| Alert Configuration | Get notified about performance anomalies | MEDIUM | Configurable thresholds (ACoS spike, budget exhausted, etc.), notification delivery handled externally |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-Time WebSocket Updates | Users want "live" data | Amazon API has rate limits, campaigns don't change second-to-second, adds complexity for marginal value | Polling every 5-15 min is sufficient, manual refresh button for immediate updates |
| Multi-User/Team Features | "What if I need collaboration later?" | Adds auth complexity, permission systems, concurrent edit handling — violates single-user constraint | Keep single-user, revisit if actual need emerges |
| Built-In AI Agent Logic | "Why build separately?" | Tight coupling makes agent logic hard to iterate, can't reuse agent across tools, harder to test | External agent via REST API allows independent development/deployment |
| Automatic Bidding (full autopilot) | "Just optimize everything automatically" | Loses user trust, hard to explain decisions, runaway spend risk, one-size-fits-all rarely works | Rules engine + AI agent with approval workflow gives control + automation |
| Complex Role-Based Access Control | "Need granular permissions" | Overkill for single user, adds UI complexity, slows development | Simple password auth sufficient for single-user context |
| In-App Cron Scheduler | "Schedule rules in the UI" | Adds scheduling complexity, reliability concerns, state management issues | External cron hits REST API endpoints, separation of concerns |
| Mobile App / Responsive Mobile UI | "Need to manage on the go" | Mobile PPC management is clunky, desktop is primary use case, doubles UI development effort | Desktop-first web app, mobile viewport functional but not optimized |
| Custom Metric Builder | "Let users define custom formulas" | Rarely used, adds UX complexity, validation nightmares | Provide standard PPC metrics (ACoS, RoAS, CTR, CVR), add new metrics as code when needed |
| Integrated Inventory Management | "Track stock levels for ads" | Out of scope, external systems handle this better, integration overhead | Focus on PPC management, let agent pull inventory data from external sources if needed |
| Social Media Ad Integration | "Manage all ads in one place" | Amazon PPC has unique metrics/workflows, cross-platform dilutes value | Specialize in Amazon, do it exceptionally well |

## Feature Dependencies

```
Campaign Data Sync
    └──requires──> Amazon API OAuth Connection
                       └──requires──> API Credentials

Campaign List View
    └──requires──> Campaign Data Sync

Keyword Performance View
    └──requires──> Campaign Data Sync

Search Term Report
    └──requires──> Campaign Data Sync
    └──enhances──> Keyword Harvesting Workflow
    └──enhances──> Negative Keyword Discovery

Rules Engine
    └──requires──> Campaign Data Sync
    └──requires──> Safety Limits Configuration
    └──requires──> Audit Log (for traceability)

AI Agent API
    └──requires──> Campaign Data Sync
    └──requires──> Safety Limits Configuration
    └──requires──> Audit Log (for traceability)
    └──requires──> Agent Chat Interface (for approvals)

Agent Chat Interface
    └──requires──> AI Agent API

Audit Log with Rollback
    └──requires──> State capture on all write operations
    └──enables──> Trust in automation (Rules, AI Agent)

Keyword Harvesting Workflow
    └──requires──> Search Term Report
    └──requires──> Keyword Management (to add new keywords)

P&L View
    └──requires──> Campaign Data Sync
    └──optionally uses──> External COGS data

Budget Pacing Alerts
    └──requires──> Campaign Data Sync (current spend)
    └──requires──> Time-based calculations

Bid Optimization Suggestions
    └──requires──> Historical metric data
    └──requires──> Trend analysis
```

### Dependency Notes

- **Campaign Data Sync is foundational:** Almost everything depends on having Amazon data in the local database
- **Safety Limits must exist before automation:** Rules engine and AI agent should not be built without safety enforcement
- **Audit Log enables trust:** Without full traceability, users won't trust automation (especially AI-driven changes)
- **Search Term Report unlocks optimization workflows:** Harvesting and negative keyword discovery both need search term data
- **Agent Chat Interface and AI Agent API are tightly coupled:** Chat is the approval mechanism for agent actions

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] **Amazon API OAuth Connection** — Can't do anything without data
- [ ] **Campaign Data Sync** — Get campaigns, ad groups, keywords, metrics into local DB
- [ ] **Overview Dashboard** — High-level performance cards (spend, sales, ACoS, impressions)
- [ ] **Campaign List View** — See all campaigns with metrics, inline budget/status editing
- [ ] **Keyword Performance View** — See keyword metrics, pause/enable keywords
- [ ] **Date Range Selection** — Filter metrics by time period
- [ ] **Basic Audit Log** — Log all changes (who/what/when/before/after) — no rollback in v1
- [ ] **Safety Limits Configuration** — Set global limits (max bid change %, daily spend cap, min bid)
- [ ] **Simple Password Auth** — Protect the dashboard
- [ ] **AI Agent REST API (core endpoints)** — GET campaigns/keywords, POST actions (with safety checks), POST chat messages
- [ ] **Agent Chat Interface (basic)** — Display agent messages, manual approval for proposed actions

**Rationale:** This validates the core loop — sync Amazon data, display it, allow manual edits, provide API for external agent to read and propose actions. Proves the foundation works before adding complexity.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] **Audit Log Rollback** — Trigger: User requests ability to undo AI changes
- [ ] **Search Term Report** — Trigger: User wants to harvest new keywords
- [ ] **Keyword Harvesting Workflow** — Trigger: Search terms are populated, need structured process
- [ ] **Rules Engine (basic)** — Trigger: User wants scheduled automations beyond AI agent
- [ ] **Budget Pacing Alerts** — Trigger: User burned through daily budget too quickly
- [ ] **Negative Keyword Discovery** — Trigger: User wants to stop wasting spend on poor performers
- [ ] **CSV Export** — Trigger: User needs to share data externally
- [ ] **Bid Optimization Suggestions** — Trigger: Agent or rules need proactive recommendations

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Visual Rules Engine Builder** — Defer: Complex UI, text-based rules sufficient for v1
- [ ] **P&L View with COGS** — Defer: Requires additional data sources, profitability analysis is advanced use case
- [ ] **Dayparting / Scheduled Rules** — Defer: Scheduling complexity, external cron can handle this
- [ ] **Cross-Campaign Analytics** — Defer: Single-campaign optimization is sufficient initially
- [ ] **PDF Export** — Defer: CSV is sufficient, PDF requires layout/formatting
- [ ] **Bulk Edit Interface** — Defer: Inline editing + API actions cover most needs initially

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Amazon API OAuth Connection | HIGH | HIGH | P1 |
| Campaign Data Sync | HIGH | HIGH | P1 |
| Overview Dashboard | HIGH | MEDIUM | P1 |
| Campaign List View | HIGH | MEDIUM | P1 |
| Keyword Performance View | HIGH | MEDIUM | P1 |
| AI Agent REST API | HIGH | HIGH | P1 |
| Agent Chat Interface | HIGH | MEDIUM | P1 |
| Safety Limits Configuration | HIGH | MEDIUM | P1 |
| Basic Audit Log | HIGH | MEDIUM | P1 |
| Date Range Selection | HIGH | LOW | P1 |
| Simple Password Auth | MEDIUM | LOW | P1 |
| Audit Log Rollback | HIGH | MEDIUM | P2 |
| Search Term Report | HIGH | HIGH | P2 |
| Keyword Harvesting Workflow | MEDIUM | MEDIUM | P2 |
| Rules Engine (basic) | MEDIUM | HIGH | P2 |
| Budget Pacing Alerts | MEDIUM | LOW | P2 |
| Negative Keyword Discovery | MEDIUM | MEDIUM | P2 |
| CSV Export | MEDIUM | LOW | P2 |
| Bid Optimization Suggestions | MEDIUM | MEDIUM | P2 |
| Visual Rules Engine Builder | LOW | HIGH | P3 |
| P&L View with COGS | LOW | HIGH | P3 |
| Dayparting / Scheduled Rules | LOW | MEDIUM | P3 |
| Cross-Campaign Analytics | LOW | MEDIUM | P3 |
| PDF Export | LOW | MEDIUM | P3 |
| Bulk Edit Interface | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch — validates core value prop
- P2: Should have — adds significant value once foundation works
- P3: Nice to have — future consideration after PMF

## Competitor Feature Analysis

Based on training data about Amazon PPC management tools (Helium 10, Perpetua, Teikametrics, Jungle Scout, SellerApp, Pacvue).

| Feature | Industry Standard | Our Approach | Notes |
|---------|------------------|--------------|-------|
| Campaign Dashboard | All tools have metrics cards, charts, campaign lists | Similar UI, focus on clarity and speed | Table stakes, match expectations |
| Keyword Management | All tools have keyword tables with metrics, status toggles | Similar, with inline editing emphasis | Table stakes |
| Search Term Reporting | Most tools have this, varying quality | Standard search term table + harvesting workflow | Expected feature |
| Bid Optimization | Most use algorithmic bidding (black box) | AI agent with approval workflow (transparent) | **Differentiator** — user retains control |
| Rules Engine | Many tools have rule builders (Helium 10, Perpetua) | Visual builder deferred to v2, text rules v1 | Common feature, our v1 is simpler |
| Bulk Actions | Standard in most tools | Deferred to v2, API covers this initially | Can add later |
| Audit Trail | Rare — most don't have full history | Full audit log with rollback from v1 | **Differentiator** — builds trust |
| AI Agent Integration | None have external AI agent APIs | REST API for external agent is core architecture | **Differentiator** — unique approach |
| Real-Time Data | Some claim "real-time", actually 15min-1hr delays | Honest about sync intervals (API rate limits) | We're transparent, not overselling |
| Multi-Account Support | Enterprise tools have this (Pacvue, Perpetua) | Single account only | Intentionally scoped down |
| Negative Keyword Automation | Some tools auto-add negatives (risky) | Suggest negatives, user approves | Safer approach |
| Dayparting | Premium feature in some tools | Deferred to v2 | Not essential for v1 |
| Portfolio Management | Some tools have portfolio-level views | Deferred | Not critical initially |
| Alerts/Notifications | Most tools have basic alerts | Threshold-based alerts, external delivery | Standard feature |

## Feature Implementation Notes

### Amazon API Integration Specifics

**Campaign Types to Support:**
- Sponsored Products (SP) — highest priority, most common
- Sponsored Brands (SB) — secondary priority
- Sponsored Display (SD) — tertiary priority

**Metrics to Track:**
- Core: impressions, clicks, spend, sales, orders
- Derived: ACoS (spend/sales), RoAS (sales/spend), CTR (clicks/impressions), CVR (orders/clicks), CPC (spend/clicks)
- Attributed: 14-day attributed sales (Amazon standard attribution window)

**API Endpoints Needed:**
- Campaigns: GET campaigns, PUT campaign (budget, status)
- Ad Groups: GET ad groups, PUT ad group
- Keywords: GET keywords, PUT keyword (bid, status)
- Search Terms: GET search term report
- Metrics: GET campaign metrics, keyword metrics (with date range)
- Profiles: GET profiles (for OAuth profile selection)

**Rate Limiting Strategy:**
- Burst: 10 req/sec
- Sustained: ~2 req/sec
- Implementation: Queue requests, exponential backoff on 429

### Rules Engine Capabilities (v1.x+)

**Trigger Types:**
- Metric threshold (ACoS > X%, spend > $Y, impressions < Z)
- Schedule (daily at time, weekly on day)
- Event (campaign paused, budget exhausted)

**Condition Logic:**
- AND/OR combination
- Date range filters (apply rule only for date range X-Y)
- Campaign/keyword targeting (specific IDs or all)

**Action Types:**
- Adjust bid (increase/decrease by % or absolute amount)
- Adjust budget (increase/decrease by % or absolute amount)
- Pause/enable campaign, ad group, keyword
- Add negative keyword
- Send notification (external webhook)

**Safety Features:**
- Dry run mode (preview changes without applying)
- Max executions per day (prevent runaway rules)
- Global safety limits apply to all rule actions
- Execution history (see what rules did)

### AI Agent API Design (v1)

**Authentication:**
- API key in header: `X-Agent-API-Key: <key>`
- Key generated in Settings UI, stored hashed

**Endpoints (MVP):**
- `GET /api/agent/campaigns` — List campaigns with metrics
- `GET /api/agent/campaigns/:id` — Campaign details (ad groups, keywords)
- `GET /api/agent/keywords` — List keywords with metrics
- `POST /api/agent/actions` — Propose action (returns action_id for approval)
- `POST /api/agent/actions/:id/execute` — Execute approved action
- `POST /api/agent/chat` — Send chat message (displayed in UI)
- `GET /api/agent/chat` — Get chat history
- `POST /api/agent/sync` — Trigger data sync from Amazon
- `GET /api/agent/status` — Heartbeat / agent status check

**Action Payload Format:**
```json
{
  "type": "adjust_bid",
  "target": {
    "type": "keyword",
    "id": "12345"
  },
  "change": {
    "from": 1.50,
    "to": 1.75
  },
  "reason": "Keyword has ACoS of 18% (target 25%), increasing bid to capture more impressions"
}
```

**Response Format:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-04T21:00:00Z",
    "request_id": "uuid"
  },
  "error": null
}
```

### Audit Log Schema

**Required Fields:**
- Timestamp (ISO 8601)
- Actor (user, agent, rule_id)
- Action type (update_campaign_budget, update_keyword_bid, pause_keyword, etc.)
- Target (campaign_id, keyword_id, etc.)
- Before state (JSON snapshot)
- After state (JSON snapshot)
- Reason (free text, provided by actor)
- Rollback status (not_rolled_back, rolled_back, rollback_failed)

**Rollback Logic:**
- Capture current state before rollback
- Apply before state to target entity via API
- Create new audit log entry (action: rollback, links to original entry)
- If API call fails, mark rollback_failed and log error

## Sources

**Confidence Note:** This research is based on training data (knowledge cutoff January 2025) about:
- Amazon Advertising API documentation and capabilities
- Competitor tools: Helium 10, Perpetua, Teikametrics, Jungle Scout, SellerApp, Pacvue
- Common Amazon PPC management workflows and best practices
- Standard SaaS dashboard patterns

**Unable to verify with external sources** due to tool access limitations. Confidence level: MEDIUM.

**Recommendations for validation:**
- Review Amazon Advertising API official documentation for latest endpoints/metrics
- Survey 2-3 competitor tools (Helium 10, Perpetua) to validate feature expectations
- Consult with Amazon sellers to confirm table stakes vs differentiators

---
*Feature research for: Amazon PPC Management Dashboard*
*Researched: 2026-02-04*
