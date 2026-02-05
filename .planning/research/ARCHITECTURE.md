# Architecture Research

**Domain:** Amazon PPC Management Dashboard
**Researched:** 2026-02-04
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │Dashboard│  │Campaign │  │Keywords │  │ Rules  │  │Settings│ │
│  │  Page   │  │  Page   │  │  Page   │  │ Engine │  │  Page  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬───┘  └────┬───┘ │
│       │            │            │            │           │      │
├───────┴────────────┴────────────┴────────────┴───────────┴──────┤
│                          API Layer                                │
│  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │  Next.js API   │  │  Agent REST  │  │  Auth Middleware   │   │
│  │  Route Handlers│  │  Endpoints   │  │                    │   │
│  └───────┬────────┘  └──────┬───────┘  └────────────────────┘   │
│          │                  │                                    │
├──────────┴──────────────────┴────────────────────────────────────┤
│                        Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐             │
│  │  Amazon API  │  │    Rules     │  │   Audit    │             │
│  │   Service    │  │   Engine     │  │  Service   │             │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘             │
│         │                 │                 │                    │
│  ┌──────┴─────────────────┴─────────────────┴──────┐             │
│  │           Rate Limiter & Queue Manager           │             │
│  └─────────────────────┬─────────────────────────────┘            │
│                        │                                          │
├────────────────────────┴──────────────────────────────────────────┤
│                          Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │    Prisma    │  │    SQLite    │  │  Amazon Ads  │            │
│  │     ORM      │  │   Database   │  │     API      │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└───────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Presentation Layer** | React Server Components for dashboard UI, client components for interactive elements | Next.js 14 App Router pages with shadcn/ui components |
| **API Route Handlers** | Internal API endpoints for dashboard UI, handles auth checks | Next.js App Router route.ts files in /app/api/* |
| **Agent REST Endpoints** | External API for AI agent, provides data reads and action execution | Next.js route handlers with JSON response format |
| **Amazon API Service** | Wraps @scaleleap/amazon-advertising-api-sdk, handles token refresh, rate limiting | Service class with OAuth2 flow and API method wrappers |
| **Rules Engine** | Evaluates rules against campaign data, executes automated actions | Rules parser + executor with safety checks |
| **Audit Service** | Logs all state changes with before/after snapshots, enables rollback | Database records with JSON diff storage |
| **Rate Limiter** | Enforces Amazon API rate limits (10 req/sec burst, 2 req/sec sustained) | Token bucket or sliding window with queue |
| **Prisma ORM** | Data access layer, schema management, migrations | Prisma Client with generated types |
| **SQLite Database** | Persistent storage for campaigns, metrics, rules, audit logs | File-based database with WAL mode |

## Recommended Project Structure

```
evolance-ppc-command-center/
├── app/                        # Next.js 14 App Router
│   ├── (dashboard)/           # Dashboard route group (requires auth)
│   │   ├── layout.tsx         # Dashboard layout with nav
│   │   ├── page.tsx           # Overview dashboard (/)
│   │   ├── campaigns/         # Campaign management
│   │   │   ├── page.tsx       # Campaign list
│   │   │   └── [id]/          # Campaign detail drill-down
│   │   ├── keywords/          # Keywords & targeting
│   │   ├── rules/             # Rules engine UI
│   │   ├── reports/           # Analytics & reports
│   │   ├── audit/             # Audit log viewer
│   │   └── settings/          # Settings page
│   ├── api/                   # API route handlers
│   │   ├── auth/              # Authentication endpoints
│   │   │   └── route.ts       # Login/logout
│   │   ├── amazon/            # Amazon API proxy endpoints
│   │   │   ├── connect/       # OAuth initiation
│   │   │   ├── callback/      # OAuth callback
│   │   │   └── sync/          # Manual sync trigger
│   │   ├── agent/             # External agent REST API
│   │   │   ├── data/          # Read endpoints (campaigns, keywords, metrics)
│   │   │   ├── actions/       # Action endpoints (update bid, pause campaign)
│   │   │   ├── chat/          # Agent chat interface
│   │   │   ├── approvals/     # Approval workflow
│   │   │   ├── audit/         # Audit log access
│   │   │   └── heartbeat/     # Health check
│   │   ├── rules/             # Rules engine endpoints
│   │   └── metrics/           # Metrics aggregation
│   ├── login/                 # Login page (public)
│   └── layout.tsx             # Root layout
├── lib/                       # Shared business logic
│   ├── amazon/                # Amazon Ads API integration
│   │   ├── client.ts          # SDK wrapper with rate limiting
│   │   ├── oauth.ts           # OAuth2 flow handlers
│   │   ├── sync.ts            # Data synchronization logic
│   │   └── types.ts           # Amazon API type definitions
│   ├── rules/                 # Rules engine
│   │   ├── engine.ts          # Rule evaluation engine
│   │   ├── executor.ts        # Action executor with safety checks
│   │   ├── templates.ts       # Preset rule templates
│   │   └── parser.ts          # Rule DSL parser
│   ├── audit/                 # Audit trail
│   │   ├── logger.ts          # Audit log writer
│   │   ├── rollback.ts        # Rollback implementation
│   │   └── diff.ts            # State diff calculator
│   ├── rate-limiter/          # Rate limiting
│   │   ├── token-bucket.ts    # Token bucket algorithm
│   │   └── queue.ts           # Request queue with backoff
│   ├── auth/                  # Authentication
│   │   ├── middleware.ts      # Auth middleware for routes
│   │   └── session.ts         # Session management (cookies)
│   └── db.ts                  # Prisma client singleton
├── components/                # Shared React components
│   ├── ui/                    # shadcn/ui components
│   ├── dashboard/             # Dashboard-specific components
│   │   ├── campaign-card.tsx  # Campaign performance card
│   │   ├── metric-chart.tsx   # Metric visualization
│   │   └── alert-banner.tsx   # Alert notifications
│   ├── rules/                 # Rules UI components
│   │   ├── rule-builder.tsx   # Visual rule builder
│   │   └── rule-card.tsx      # Rule display card
│   └── audit/                 # Audit UI components
│       ├── audit-log.tsx      # Audit log viewer
│       └── rollback-dialog.tsx# Rollback confirmation
├── prisma/                    # Database schema & migrations
│   ├── schema.prisma          # Data model
│   ├── migrations/            # Migration history
│   └── seed.ts                # Seed data (optional)
├── types/                     # TypeScript type definitions
│   ├── api.ts                 # API request/response types
│   ├── agent.ts               # Agent API types
│   └── rules.ts               # Rules engine types
├── utils/                     # Utility functions
│   ├── validation.ts          # Input validation
│   ├── formatting.ts          # Data formatting (currency, percent)
│   └── safety.ts              # Safety limit enforcement
└── middleware.ts              # Next.js middleware (auth check)
```

### Structure Rationale

- **(dashboard)/ route group:** Keeps dashboard pages together, shares auth layout without affecting URL structure
- **lib/ for business logic:** Separates domain logic from UI, makes logic reusable across API routes and pages
- **lib/amazon/client.ts:** Single point of Amazon API interaction, enforces rate limiting globally
- **lib/rules/engine.ts:** Isolated rules engine can be tested independently, reused by both UI and API
- **lib/audit/:** Centralized audit logging ensures consistency across all state-changing operations
- **app/api/agent/:** Dedicated namespace for external agent API, clear separation from internal endpoints
- **Rate limiter as shared service:** All Amazon API calls funnel through rate limiter, prevents accidental quota exhaustion

## Architectural Patterns

### Pattern 1: Rate-Limited API Client Wrapper

**What:** Wrap @scaleleap/amazon-advertising-api-sdk with a rate limiter that enforces Amazon's 10 req/sec burst and 2 req/sec sustained limits.

**When to use:** Essential for any Amazon Ads API integration to avoid 429 errors and account throttling.

**Trade-offs:**
- **Pros:** Prevents API quota exhaustion, graceful degradation under load, queue visibility
- **Cons:** Adds latency to API calls, requires queue management

**Example:**
```typescript
// lib/amazon/client.ts
import { AdvertisingClient } from '@scaleleap/amazon-advertising-api-sdk';
import { RateLimiter } from '../rate-limiter/token-bucket';

const rateLimiter = new RateLimiter({
  tokensPerInterval: 10,     // 10 req/sec burst
  interval: 1000,             // 1 second
  sustainedRate: 2,           // 2 req/sec sustained
});

export class AmazonAPIClient {
  private client: AdvertisingClient;

  constructor() {
    this.client = new AdvertisingClient({
      clientId: process.env.AMAZON_CLIENT_ID!,
      clientSecret: process.env.AMAZON_CLIENT_SECRET!,
      refreshToken: this.getRefreshToken(), // From database
    });
  }

  async getCampaigns(profileId: string) {
    await rateLimiter.waitForToken(); // Blocks until token available
    return this.client.campaigns.list(profileId);
  }

  // All API methods follow same pattern
}
```

### Pattern 2: Audit-Wrapped State Mutations

**What:** Wrap all state-changing operations with automatic audit logging that captures before/after state.

**When to use:** Any operation that modifies campaign data, especially those triggered by rules or agent actions.

**Trade-offs:**
- **Pros:** Complete audit trail, enables rollback, debugging aid
- **Cons:** Database write overhead, storage growth

**Example:**
```typescript
// lib/audit/logger.ts
import { prisma } from '../db';

export async function auditedUpdate<T>(
  entity: string,
  entityId: string,
  operation: string,
  updateFn: () => Promise<T>,
  context: { userId?: string; agentId?: string; ruleId?: string }
): Promise<T> {
  // Capture before state
  const before = await getEntityState(entity, entityId);

  // Execute operation
  const result = await updateFn();

  // Capture after state
  const after = await getEntityState(entity, entityId);

  // Log audit record
  await prisma.auditLog.create({
    data: {
      entity,
      entityId,
      operation,
      beforeState: JSON.stringify(before),
      afterState: JSON.stringify(after),
      ...context,
      timestamp: new Date(),
    },
  });

  return result;
}

// Usage in API route
await auditedUpdate(
  'Campaign',
  campaignId,
  'update_budget',
  async () => {
    return prisma.campaign.update({
      where: { id: campaignId },
      data: { dailyBudget: newBudget },
    });
  },
  { agentId: req.headers['x-agent-id'] }
);
```

### Pattern 3: Two-Phase Data Sync

**What:** Separate Amazon API data fetching (phase 1) from local database persistence (phase 2) to handle partial failures gracefully.

**When to use:** Background sync jobs that pull data from Amazon Ads API.

**Trade-offs:**
- **Pros:** Atomic database updates, can retry failed API calls without re-persisting, easier error handling
- **Cons:** Increased memory usage during sync, more complex sync logic

**Example:**
```typescript
// lib/amazon/sync.ts
export async function syncCampaigns(profileId: string) {
  // Phase 1: Fetch from Amazon API (can fail/retry)
  const campaigns = await fetchAllCampaigns(profileId); // Handles pagination, retries
  const metrics = await fetchCampaignMetrics(profileId, campaigns.map(c => c.id));

  // Phase 2: Persist to database (atomic transaction)
  await prisma.$transaction(async (tx) => {
    // Upsert campaigns
    for (const campaign of campaigns) {
      await tx.campaign.upsert({
        where: { amazonCampaignId: campaign.campaignId },
        create: { ...mapCampaignData(campaign) },
        update: { ...mapCampaignData(campaign) },
      });
    }

    // Upsert metrics
    for (const metric of metrics) {
      await tx.campaignMetric.create({
        data: { ...mapMetricData(metric) },
      });
    }

    // Update sync timestamp
    await tx.syncHistory.create({
      data: {
        entity: 'campaigns',
        profileId,
        syncedAt: new Date(),
        recordCount: campaigns.length,
      },
    });
  });
}
```

### Pattern 4: Safety-Checked Action Execution

**What:** Enforce configurable safety limits on all bid/budget changes before execution.

**When to use:** Any endpoint that modifies campaign settings, especially agent-triggered actions.

**Trade-offs:**
- **Pros:** Prevents catastrophic mistakes (e.g., $10k daily budget), configurable per user
- **Cons:** Adds complexity to action execution, can block valid actions if limits too strict

**Example:**
```typescript
// utils/safety.ts
export interface SafetyLimits {
  maxBidChangePercent: number;      // e.g., 50% max increase/decrease
  maxBudgetChangePercent: number;   // e.g., 100% max increase
  maxDailyBudget: number;           // e.g., $500 absolute max
  minBid: number;                   // e.g., $0.10 floor
}

export async function validateBudgetChange(
  campaignId: string,
  newBudget: number,
  limits: SafetyLimits
): Promise<{ valid: boolean; reason?: string }> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { valid: false, reason: 'Campaign not found' };

  // Check absolute max
  if (newBudget > limits.maxDailyBudget) {
    return { valid: false, reason: `Exceeds max daily budget (${limits.maxDailyBudget})` };
  }

  // Check percent change
  const currentBudget = campaign.dailyBudget;
  const percentChange = ((newBudget - currentBudget) / currentBudget) * 100;

  if (Math.abs(percentChange) > limits.maxBudgetChangePercent) {
    return {
      valid: false,
      reason: `Budget change of ${percentChange.toFixed(1)}% exceeds limit (${limits.maxBudgetChangePercent}%)`
    };
  }

  return { valid: true };
}

// Usage in API route
const validation = await validateBudgetChange(campaignId, newBudget, safetyLimits);
if (!validation.valid) {
  return NextResponse.json({ error: validation.reason }, { status: 400 });
}
```

### Pattern 5: Agent API Standard Response Format

**What:** Consistent JSON structure for all agent API responses: `{ data, meta, error }`.

**When to use:** All `/api/agent/*` endpoints to provide predictable interface for external AI agent.

**Trade-offs:**
- **Pros:** Easy to parse, consistent error handling, supports pagination metadata
- **Cons:** Slightly more verbose than minimal responses

**Example:**
```typescript
// types/api.ts
export interface AgentAPIResponse<T = unknown> {
  data?: T;
  meta?: {
    pagination?: { page: number; limit: number; total: number };
    timestamp: string;
    version: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// app/api/agent/data/campaigns/route.ts
export async function GET(req: Request): Promise<Response> {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: { metrics: { orderBy: { date: 'desc' }, take: 7 } },
    });

    return NextResponse.json<AgentAPIResponse<Campaign[]>>({
      data: campaigns,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
      },
    });
  } catch (error) {
    return NextResponse.json<AgentAPIResponse>({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch campaigns',
        details: { error: String(error) },
      },
    }, { status: 500 });
  }
}
```

## Data Flow

### Request Flow: Dashboard User Action

```
[User clicks "Update Budget" in UI]
    ↓
[Client Component] → POST /api/campaigns/[id]/budget
    ↓
[Auth Middleware] → validates session cookie
    ↓
[API Route Handler] → validates input, checks safety limits
    ↓
[Audit Logger] → captures before state
    ↓
[Prisma] → updates local database
    ↓
[Amazon API Service] → rate-limited update to Amazon Ads API
    ↓
[Audit Logger] → captures after state, writes audit log
    ↓
[Response] ← returns updated campaign
    ↓
[Client Component] ← revalidates, updates UI
```

### Request Flow: Agent API Action

```
[External AI Agent] → POST /api/agent/actions/update-bid
    ↓
[Auth Middleware] → validates X-API-Key header
    ↓
[Agent API Route Handler] → validates payload structure
    ↓
[Safety Validator] → checks bid change against safety limits
    ↓
[Audit Logger] → captures before state with agentId context
    ↓
[Prisma] → updates local database
    ↓
[Amazon API Service] → rate-limited update to Amazon Ads API
    ↓
[Audit Logger] → captures after state, writes audit log
    ↓
[Response] ← returns { data: updatedKeyword, meta: { ... } }
    ↓
[External AI Agent] ← processes response
```

### Data Flow: Background Sync

```
[Cron Job] → triggers sync via external scheduler
    ↓
[POST /api/amazon/sync] → authenticated sync endpoint
    ↓
[Sync Service] → fetches campaigns from Amazon API (Phase 1)
    ↓
[Rate Limiter] → enforces API limits, queues requests
    ↓
[Amazon Ads API] → returns campaign data, metrics
    ↓
[Sync Service] → persists to database (Phase 2, atomic transaction)
    ↓
[Prisma Transaction] → upserts campaigns, metrics, updates sync timestamp
    ↓
[Sync History] → logs successful sync with record count
    ↓
[Response] ← returns { syncedAt, recordCount }
```

### State Management: Rules Engine Execution

```
[Rules Engine Scheduler] → evaluates active rules on interval
    ↓
[Rule Engine] → loads active rules from database
    ↓
[For each rule]:
    ↓
[Condition Evaluator] → fetches latest metrics, evaluates conditions
    ↓
[If conditions met]:
    ↓
[Action Executor] → validates action against safety limits
    ↓
[Audit Logger] → captures before state with ruleId context
    ↓
[Prisma] → updates campaign/keyword/ad group
    ↓
[Amazon API Service] → rate-limited update to Amazon Ads API
    ↓
[Audit Logger] → captures after state
    ↓
[Rule Execution Log] → records execution with outcome (success/skipped/failed)
```

### Key Data Flows

1. **Amazon API → Local Database:** Sync job fetches data periodically, upserts to SQLite, enables fast dashboard queries
2. **Dashboard UI → Amazon API:** User actions update local database first, then propagate to Amazon API asynchronously with rate limiting
3. **Agent API → Amazon API:** External agent triggers actions via REST API, same audit/safety flow as dashboard
4. **Rules Engine → Amazon API:** Automated rule execution evaluates conditions against local metrics, executes actions with full audit trail

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **Single user (current)** | SQLite sufficient, no connection pooling needed, file-based database with WAL mode, local deployment |
| **5-10 concurrent users** | Still SQLite (handles ~100k reads/sec), add Redis for session storage, consider horizontal pod scaling behind load balancer |
| **100+ concurrent users** | Migrate to PostgreSQL for better concurrency, connection pooling required, separate read replicas for dashboard queries, dedicated worker for sync jobs |

### Scaling Priorities

1. **First bottleneck: Amazon API rate limits**
   - **What breaks:** Exceeding 10 req/sec burst or sustained 2 req/sec causes 429 throttling
   - **Fix:** Implement token bucket rate limiter with queue (Pattern 1), exponential backoff on 429 responses
   - **When:** Critical from day 1 — Amazon API throttling is account-level, affects all requests

2. **Second bottleneck: Sync job duration**
   - **What breaks:** Syncing large accounts (1000+ campaigns) can take 5-10 minutes, blocks other API calls
   - **Fix:** Implement incremental sync (only fetch changed data since last sync), parallel fetching with rate limiter coordination, pagination handling
   - **When:** When account grows beyond 200 campaigns or sync takes >2 minutes

3. **Third bottleneck: Database query performance**
   - **What breaks:** Dashboard queries slow down as metric history grows (1 year = ~365 records per campaign)
   - **Fix:** Add indexes on frequently queried columns (campaignId, date), implement data retention policy (archive metrics older than 1 year), use Prisma query optimization
   - **When:** After 6 months of operation or 100k+ metric records

## Anti-Patterns

### Anti-Pattern 1: Direct Amazon API Calls from UI Components

**What people do:** Import @scaleleap/amazon-advertising-api-sdk directly in React components or page.tsx files

**Why it's wrong:**
- Exposes API credentials to client bundle (security risk)
- Cannot enforce rate limiting globally (quota exhaustion)
- No audit trail for actions
- Difficult to test and mock

**Do this instead:**
- All Amazon API calls must go through `lib/amazon/client.ts`
- UI components call Next.js API routes (`/api/campaigns/[id]`)
- API routes use the centralized Amazon API client with rate limiting

### Anti-Pattern 2: Synchronous Amazon API Calls in API Routes

**What people do:** Await Amazon API responses directly in API route handlers, blocking request until completion

**Why it's wrong:**
- API routes timeout after 60 seconds (Next.js default), Amazon API can be slow
- Poor user experience during rate limit delays
- No visibility into queue status

**Do this instead:**
- Return optimistic response immediately after local database update
- Queue Amazon API update asynchronously
- Provide separate endpoint to check sync status (`/api/sync/status`)
- For critical operations, use polling or webhook to notify when Amazon API update completes

### Anti-Pattern 3: Storing Amazon API Tokens in Environment Variables

**What people do:** Save OAuth refresh tokens in `.env` file

**Why it's wrong:**
- Refresh tokens expire and change after each use (Amazon rotates them)
- `.env` file is static, cannot update programmatically
- Multi-profile support impossible
- Token refresh failures require manual intervention

**Do this instead:**
- Store refresh tokens in database (`Setting` table or dedicated `AmazonProfile` table)
- Update refresh token in database after each token refresh
- Implement token refresh error handling with user notification

### Anti-Pattern 4: Missing Safety Limits on Agent Actions

**What people do:** Trust external agent to never send bad values, execute actions without validation

**Why it's wrong:**
- Agent bugs or hallucinations can cause catastrophic changes ($10k budget, $100 CPC bid)
- No way to undo bulk mistakes
- Account suspension risk from policy violations

**Do this instead:**
- Enforce safety limits on all action endpoints (Pattern 4)
- Make safety limits configurable in Settings UI
- Return validation errors to agent with clear reason
- Require approval for changes exceeding thresholds (add approval workflow)

### Anti-Pattern 5: Monolithic Sync Job

**What people do:** Single sync endpoint that fetches all data (campaigns, ad groups, keywords, metrics) in one request

**Why it's wrong:**
- Long-running requests prone to timeout
- All-or-nothing sync (partial failures lose all progress)
- Cannot prioritize critical data (e.g., today's metrics over historical)
- Difficult to retry specific entities

**Do this instead:**
- Separate sync endpoints per entity type (`/api/amazon/sync/campaigns`, `/api/amazon/sync/metrics`)
- Implement incremental sync with `lastSyncedAt` timestamp
- Allow selective sync (e.g., "sync last 7 days metrics only")
- Return granular status for each entity type

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Amazon Advertising API** | OAuth2 + REST via @scaleleap/amazon-advertising-api-sdk | Token refresh handled by SDK, rate limiting required, profile selection after auth |
| **External AI Agent** | REST API consumer via `/api/agent/*` endpoints | Agent authenticates with X-API-Key header, consumes standard JSON responses |
| **Cloudflare Tunnel** | Reverse proxy to local port 3001 | Configured externally, provides HTTPS access at ppc.evolancelabs.com |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **UI ↔ Internal API** | Fetch API calls to `/api/*` routes | Session cookie auth, JSON request/response |
| **Internal API ↔ Business Logic** | Direct function imports from `lib/*` | Type-safe, server-side only |
| **Business Logic ↔ Amazon API** | Calls via `lib/amazon/client.ts` singleton | Rate limiting enforced, retries handled |
| **Business Logic ↔ Database** | Prisma Client queries | Generated types, transaction support |
| **Agent API ↔ Business Logic** | Same as internal API, different auth (API key vs session) | Shared validation and safety logic |
| **Rules Engine ↔ Database** | Prisma queries for rule evaluation | Reads metrics, writes rule execution logs |

### Component Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard UI Pages (app/(dashboard)/*)                     │
└───────────┬─────────────────────────────────────────────────┘
            ↓ (server actions or fetch)
┌───────────┴─────────────────────────────────────────────────┐
│  API Route Handlers (app/api/*)                             │
│  - Auth Middleware validates session/API key               │
│  - Calls business logic in lib/*                           │
└───────────┬─────────────────────────────────────────────────┘
            ↓
┌───────────┴─────────────────────────────────────────────────┐
│  Business Logic (lib/*)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Amazon API   │  │ Rules Engine │  │ Audit Logger │      │
│  │ Service      │  │              │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         ↓                 ↓                 ↓              │
│    Rate Limiter ──────────┴─────────────────┘              │
└───────────┬─────────────────────────────────────────────────┘
            ↓
┌───────────┴─────────────────────────────────────────────────┐
│  Data Layer (Prisma + SQLite)                               │
└─────────────────────────────────────────────────────────────┘
```

## Build Order Recommendations

Based on component dependencies and feature requirements, suggested build order:

### Phase 1: Foundation (Week 1)
- Database schema (Prisma models for Campaign, AdGroup, Keyword, Metric, Setting)
- Authentication system (password login, session middleware)
- Amazon OAuth flow (connect, callback, token storage in database)
- Rate limiter implementation (token bucket with queue)
- Amazon API client wrapper (basic CRUD methods with rate limiting)

### Phase 2: Data Sync (Week 1-2)
- Sync service for campaigns (two-phase pattern)
- Sync service for metrics (daily/weekly aggregation)
- Sync history tracking
- Manual sync trigger endpoint

### Phase 3: Dashboard UI (Week 2-3)
- Dashboard layout with navigation
- Overview page with performance cards
- Campaign list page with metrics
- Basic filtering and sorting

### Phase 4: Agent API (Week 3)
- Agent API authentication (API key management)
- Data read endpoints (`/api/agent/data/*`)
- Standard response format implementation
- API documentation for agent

### Phase 5: Actions & Safety (Week 4)
- Safety limit configuration in Settings
- Action endpoints with validation (update bid, budget, pause/enable)
- Audit logging for all actions
- Agent action endpoints (`/api/agent/actions/*`)

### Phase 6: Rules Engine (Week 5)
- Rule data model and storage
- Rule condition evaluator
- Rule action executor with safety checks
- Rules UI (list, create, edit)

### Phase 7: Advanced Features (Week 6+)
- Audit log viewer with filtering
- Rollback capability
- Reports & analytics
- Agent chat interface
- Bulk actions

**Rationale:**
1. **Foundation first:** Auth and Amazon API connection are prerequisites for everything else
2. **Data before UI:** Sync must work to populate database for dashboard to display
3. **Dashboard before agent API:** Validates data model and business logic with human testing
4. **Safety before automation:** Ensure safety limits work before enabling rules/agent actions
5. **Rules engine last:** Most complex feature, depends on stable data sync and action execution

## Sources

**Confidence Note:** This research is based on my training data (MEDIUM confidence) as WebSearch and WebFetch were unavailable. Key patterns are drawn from:

- Next.js 14 App Router architecture patterns (official Next.js documentation as of training cutoff)
- Common PPC management dashboard architectures (patterns from tools like Optmyzr, Adalysis)
- Amazon Advertising API rate limiting (based on typical Amazon API patterns, specific limits should be verified in official docs)
- @scaleleap/amazon-advertising-api-sdk patterns (based on SDK design patterns, should verify with package README)

**Verification recommended:**
- Amazon Advertising API official rate limits (verify at advertising.amazon.com/API/docs)
- @scaleleap/amazon-advertising-api-sdk current API (check GitHub repo)
- Next.js 14 App Router best practices for API routes (verify at nextjs.org/docs)

---
*Architecture research for: Amazon PPC Management Dashboard*
*Researched: 2026-02-04*
