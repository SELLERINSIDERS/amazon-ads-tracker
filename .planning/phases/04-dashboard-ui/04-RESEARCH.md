# Phase 4 Research: Dashboard UI

## Overview

Phase 4 implements the dashboard UI showing campaign performance and metrics.

## Requirements Analysis

### Performance Cards (DASH-01, DASH-02)
- Total Spend, ACoS, ROAS, Impressions, Clicks, CTR, CPC, Orders, Sales
- 7d/30d trends with % change
- Need aggregated metrics from CampaignMetric table

### Agent Status (DASH-03)
- Last heartbeat timestamp
- Last action description
- Current state (idle, active, etc.)
- **Note**: Agent integration is Phase 7 - show placeholder

### Recent Actions (DASH-04)
- Last 24 hours of activity
- **Note**: Audit logging is Phase 6 - show placeholder

### Alerts (DASH-05, DASH-06)
- Budget pacing warnings
- High ACoS campaigns
- Paused campaigns
- Top/worst performers
- Can implement based on synced data

### Campaign Table (CAMP-01, CAMP-02, CAMP-03)
- All campaigns (SP/SB/SD)
- Columns: name, type, status, budget, impressions, clicks, CTR, spend, CPC, orders, sales, ACoS, ROAS
- Sortable columns
- Filterable by type, status

### Date Range Selector (CAMP-07)
- Today, Yesterday, 7d, 30d, 90d, Custom, Lifetime
- Persisted in URL params or state
- Affects all data queries

## Data Model

Current CampaignMetric schema:
```prisma
model CampaignMetric {
  id           String    @id
  campaignId   String
  date         String    // YYYYMMDD
  impressions  Int
  clicks       Int
  cost         Float
  orders       Int
  sales        Float
}
```

Note: Metrics data requires Amazon Reporting API (async). For Phase 4, we'll:
1. Build the UI structure
2. Show aggregated data from what we have
3. Display 0 values where metrics not yet synced

## Implementation Plan

### Plan 04-01: Date Range & Context
- Date range selector component
- Date range context/provider
- URL param integration

### Plan 04-02: Performance Cards
- Aggregate metrics calculation
- Card components with trends
- Loading states

### Plan 04-03: Campaign Table
- Data table component
- Sortable columns
- Type and status filters
- Pagination

### Plan 04-04: Alerts & Placeholders
- Alerts section (paused campaigns, etc.)
- Agent status placeholder
- Recent actions placeholder

## UI Components Needed

From shadcn/ui:
- Card (already have)
- Button (already have)
- Input (already have)
- Select (need to add)
- Table (need to add)
- Badge (can style manually or add)

---
*Research completed: 2026-02-05*
