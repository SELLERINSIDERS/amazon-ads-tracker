# Research: Phase 8 - Rules & Reports

## Overview
This phase adds automation rules and reporting capabilities. Due to external dependencies (Amazon Reporting API for search terms, Amazon API write access for rollback), some features will be deferred.

## Components to Implement

### 1. Rules Engine
- Database model for rules with conditions and actions
- Rule execution engine with cooldown tracking
- Preset rule templates
- Rules management UI

### 2. Performance Charts
- Trend charts using existing metrics data
- Period comparison (current vs previous)
- Use simple SVG or chart library

### 3. CSV Export
- Export campaigns, keywords to CSV
- Export audit log to CSV

## Features to Defer (Blocked on External Dependencies)

### Search Term Analysis
- Requires Amazon Search Term Report API
- Blocked: No API integration yet

### Rollback Capability
- Requires syncing changes back to Amazon API
- Blocked: No Amazon API write access

### Notification Config
- Would need external service (email, webhook)
- Blocked: No notification service configured

## Implementation Plan

1. **Plan 08-01**: Rules database model and management UI
2. **Plan 08-02**: Rules execution engine with cooldown
3. **Plan 08-03**: Performance charts and CSV export

## Rules Model Design

```prisma
model AutomationRule {
  id          String    @id @default(cuid())
  name        String
  description String?
  enabled     Boolean   @default(true)

  // Condition
  conditionType    String  // 'acos_above', 'roas_below', 'clicks_above', etc.
  conditionValue   Float
  conditionEntity  String  // 'keyword', 'campaign'

  // Action
  actionType       String  // 'decrease_bid', 'increase_bid', 'pause', etc.
  actionValue      Float?  // e.g., percentage change

  // Execution control
  cooldownHours    Int     @default(24)
  lastExecutedAt   DateTime?
  executionCount   Int     @default(0)

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model RuleExecution {
  id        String   @id @default(cuid())
  ruleId    String
  entityType String
  entityId   String
  entityName String?
  result    String   // 'success', 'skipped', 'failed'
  message   String?
  executedAt DateTime @default(now())
}
```

## Preset Rule Templates

1. **High ACoS Reducer**: If ACoS > 50%, decrease bid by 10%
2. **Low Performance Pauser**: If clicks > 100 and orders = 0, pause keyword
3. **Winner Booster**: If ROAS > 3, increase bid by 5%
