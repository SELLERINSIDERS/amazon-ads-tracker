# Evolance PPC Command Center

## What This Is

A Next.js web dashboard for managing Amazon PPC advertising campaigns. It connects to the Amazon Advertising API via OAuth2, displays campaign performance data, provides a rules engine for automated optimizations, and exposes a REST API for an external AI agent to read data, execute actions, and communicate via chat. Single-user app for Andrei to manage Amazon ad campaigns from one place.

## Core Value

The REST API and audit trail must work flawlessly — they are the foundation the AI agent plugs into, and every action must be traceable and reversible.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Amazon Ads API OAuth2 connection (auth code exchange, token refresh, profile selection)
- [ ] Campaign data sync from Amazon Ads API (SP/SB/SD campaigns, ad groups, keywords, metrics)
- [ ] Overview dashboard with performance cards, trends, alerts, and agent status
- [ ] Campaign list with full metrics, inline editing (budget, bid, status), and drill-down to ad groups/keywords
- [ ] Keywords & targeting page with keyword metrics, search term reports, and bulk actions
- [ ] Rules engine with visual rule builder, preset templates, execution history, and safety limits
- [ ] Agent chat interface with approval cards for proposed actions
- [ ] Reports & analytics with date ranges, trend charts, P&L view, search term analysis, CSV/PDF export
- [ ] Audit log with before/after state, filtering, rollback capability, and export
- [ ] Settings page for API connection, safety limits, notification config, and agent API key management
- [ ] REST API for external agent (data reads, actions, chat, approvals, audit, sync, heartbeat)
- [ ] Safety enforcement on all action endpoints (max bid/budget change %, absolute max daily spend, min bid floor)
- [ ] Simple password authentication (single user)

### Out of Scope

- AI agent implementation — built separately, connects via REST API
- Cron scheduling — handled externally
- Messaging integrations (Slack, email, etc.) — handled externally
- Multi-user / multi-account support — single user, single Amazon account
- Mobile app — web only
- Real-time WebSocket updates — polling is sufficient for v1

## Context

- Amazon Ads API credentials (LWA client ID/secret) already available in `.env`
- Using `@scaleleap/amazon-advertising-api-sdk` for Amazon API integration (TypeScript, handles OAuth/token refresh natively)
- App runs locally on port 3001 (port 3000 is taken by an unrelated app)
- Cloudflare tunnel will expose the app at ppc.evolancelabs.com (configured externally)
- The external AI agent will be built later and will consume the REST API — API design should be clean, RESTful, with consistent JSON structure `{ data, meta, error }`
- Dashboard password set via `PPC_DASHBOARD_PASSWORD` env var
- SQLite database via Prisma ORM for simplicity and portability
- Data model includes: Campaign, AdGroup, Keyword, CampaignMetric, KeywordMetric, SearchTerm, Rule, RuleExecution, AgentAction, AgentMessage, Setting

## Constraints

- **Tech stack**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, Prisma + SQLite, Recharts or Tremor
- **Port**: 3001 (3000 is occupied)
- **Auth**: Simple password auth, no OAuth/SSO for dashboard access
- **Amazon API rate limits**: 10 req/sec burst, ~2 req/sec sustained — must implement rate limiting/queuing
- **Amazon API SDK**: `@scaleleap/amazon-advertising-api-sdk` — no custom API client
- **Deployment**: Local machine with launchd auto-start, Cloudflare tunnel for external access

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use @scaleleap/amazon-advertising-api-sdk instead of MCP servers or custom client | TypeScript native, same stack as Next.js, handles OAuth/refresh, no bridge layer | — Pending |
| SQLite over Postgres | Single user, local deployment, simplicity, no need for concurrent connections | — Pending |
| REST API over GraphQL for agent interface | Simpler, agent will adapt to whatever we build, standard conventions sufficient | — Pending |
| Single password auth over full auth system | Single user app, complexity not justified | — Pending |

---
*Last updated: 2026-02-04 after initialization*
