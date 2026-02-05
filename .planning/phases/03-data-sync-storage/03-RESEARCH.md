# Phase 3 Research: Data Sync & Storage

## Overview

Phase 3 implements data synchronization from Amazon Advertising API to local SQLite database.

## Key Findings

### Campaign Types

1. **Sponsored Products (SP)** - Product-level ads
2. **Sponsored Brands (SB)** - Brand-level ads with headlines
3. **Sponsored Display (SD)** - Display ads on/off Amazon

### API Endpoint Structure

Base URL: `https://advertising-api.amazon.com` (NA region)

**Campaign Endpoints:**
- SP: `/sp/campaigns`
- SB: `/sb/v4/campaigns`
- SD: `/sd/campaigns`

**Ad Group Endpoints:**
- SP: `/sp/adGroups`
- SB: `/sb/v4/adGroups`
- SD: `/sd/adGroups`

**Keyword Endpoints:**
- SP: `/sp/keywords`
- SB: `/sb/keywords`

### Data Structures

**Campaign:**
```json
{
  "campaignId": "string",
  "name": "string",
  "state": "enabled|paused|archived",
  "budget": { "amount": number, "budgetType": "daily" },
  "startDate": "YYYYMMDD",
  "endDate": "YYYYMMDD"
}
```

**Ad Group:**
```json
{
  "adGroupId": "string",
  "campaignId": "string",
  "name": "string",
  "state": "enabled|paused|archived",
  "defaultBid": number
}
```

**Keyword:**
```json
{
  "keywordId": "string",
  "adGroupId": "string",
  "keywordText": "string",
  "matchType": "exact|phrase|broad",
  "state": "enabled|paused|archived",
  "bid": number
}
```

### Reporting (Async Pattern)

1. POST report request with metrics and date range
2. Receive reportId
3. Poll status until COMPLETED
4. Download report data

**Key Metrics:**
- impressions, clicks, cost, orders, sales
- acos, roas, ctr, cpc

### Sync Strategy

**Two-Phase Pattern:**
1. **Fetch Phase**: Collect all data from API into memory
2. **Persist Phase**: Atomic database transaction

**Rate Limiting:**
- Use existing rate limiter (10 burst, 2/sec sustained)
- Exponential backoff on 429 errors

### Prisma Schema

```prisma
model Campaign {
  id           String    @id
  profileId    String
  type         String    // SP, SB, SD
  name         String
  state        String
  budget       Float?
  budgetType   String?
  startDate    String?
  endDate      String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  adGroups     AdGroup[]
  metrics      CampaignMetric[]
}

model AdGroup {
  id           String    @id
  campaignId   String
  campaign     Campaign  @relation(fields: [campaignId], references: [id])
  name         String
  state        String
  defaultBid   Float?
  keywords     Keyword[]
}

model Keyword {
  id           String    @id
  adGroupId    String
  adGroup      AdGroup   @relation(fields: [adGroupId], references: [id])
  keywordText  String
  matchType    String
  state        String
  bid          Float?
}

model CampaignMetric {
  id           String    @id @default(cuid())
  campaignId   String
  campaign     Campaign  @relation(fields: [campaignId], references: [id])
  date         String
  impressions  Int       @default(0)
  clicks       Int       @default(0)
  cost         Float     @default(0)
  orders       Int       @default(0)
  sales        Float     @default(0)
  @@unique([campaignId, date])
}

model SyncState {
  id           String    @id @default(cuid())
  profileId    String    @unique
  lastSyncAt   DateTime?
  syncStatus   String    @default("idle") // idle, syncing, completed, failed
  error        String?
  updatedAt    DateTime  @updatedAt
}
```

## Implementation Plan

### Plan 03-01: Schema & Models
- Prisma schema updates
- Migration
- Model relationships

### Plan 03-02: API Fetchers
- Campaign fetchers (SP, SB, SD)
- Ad group fetchers
- Keyword fetchers
- Pagination handling

### Plan 03-03: Sync Engine
- Two-phase sync implementation
- Atomic persist with transaction
- Sync state management
- Error handling

### Plan 03-04: UI & Trigger
- Manual sync button
- Sync status display
- Last sync timestamp

---
*Research completed: 2026-02-05*
