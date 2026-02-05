# Research: Phase 6 - Safety & Audit Foundation

## Overview
This phase establishes safety guardrails and audit logging before enabling any automated actions (agent or rules). This is critical infrastructure that must be in place before Phase 7 (Agent Integration).

## Components Needed

### 1. Safety Limits Configuration
- Database model to store user-configurable limits
- Settings UI to configure limits
- Validation functions to check actions against limits

**Limits to Configure:**
- Max bid change % (e.g., 50% max increase/decrease per action)
- Max budget change % (e.g., 100% max increase per action)
- Max daily spend limit (absolute cap)
- Min bid floor (prevent bids below threshold)
- Max bid ceiling (prevent excessive bids)

### 2. Audit Log System
- Database model for audit entries
- Audit service to log actions
- Before/after state capture as JSON

**Audit Entry Fields:**
- Timestamp
- Actor type (user, agent, rule)
- Actor ID (user session, agent key, rule ID)
- Action type (bid_change, budget_change, status_change, keyword_add, etc.)
- Entity type (campaign, keyword, ad_group)
- Entity ID
- Before state (JSON)
- After state (JSON)
- Reason/description
- Success/failure status

### 3. Audit Log UI
- Table view of audit entries
- Filters: action type, date range, entity type, actor
- Details view showing before/after diff

## Database Schema Additions

```prisma
model SafetyLimit {
  id              String   @id @default(cuid())
  maxBidChangePct Float    @default(50)
  maxBudgetChangePct Float @default(100)
  maxDailySpend   Float?
  minBidFloor     Float    @default(0.02)
  maxBidCeiling   Float    @default(100)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model AuditEntry {
  id          String   @id @default(cuid())
  timestamp   DateTime @default(now())
  actorType   String   // 'user' | 'agent' | 'rule'
  actorId     String?  // user session ID, agent key, rule ID
  actionType  String   // 'bid_change', 'budget_change', 'status_change', etc.
  entityType  String   // 'campaign', 'keyword', 'ad_group'
  entityId    String
  entityName  String?  // For display
  beforeState Json?
  afterState  Json?
  reason      String?
  success     Boolean  @default(true)
  errorMsg    String?
}
```

## Implementation Approach

1. **Plan 06-01**: Database schema for SafetyLimit and AuditEntry
2. **Plan 06-02**: Safety limits settings UI and validation service
3. **Plan 06-03**: Audit logging service and audit log page

## Key Design Decisions

1. **Single SafetyLimit row**: Only one set of limits per installation (no per-user limits)
2. **JSON state snapshots**: Capture full entity state, not just changed fields
3. **Actor tracking**: Essential for distinguishing manual vs automated actions
4. **No deletion of audit entries**: Audit log is append-only for compliance
