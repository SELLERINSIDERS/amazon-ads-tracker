# Research: Phase 7 - Agent Integration

## Overview
This phase enables external AI agents to interact with the dashboard via REST API. The agent can read campaign data, execute actions (with safety limits), and communicate via chat messages.

## Components Needed

### 1. API Key Management
- Database model for API keys
- Settings UI for key generation/rotation/revocation
- Middleware for X-Agent-Key header validation

### 2. REST API Endpoints

**Read Endpoints (GET):**
- `/api/agent/campaigns` - List campaigns with metrics
- `/api/agent/keywords` - List keywords with metrics
- `/api/agent/metrics` - Aggregate metrics summary
- `/api/agent/status` - Connection and sync status

**Action Endpoints (POST):**
- `/api/agent/actions/bid` - Adjust bid (with safety limits)
- `/api/agent/actions/budget` - Adjust budget (with safety limits)
- `/api/agent/actions/status` - Change campaign/keyword status
- `/api/agent/sync` - Trigger data sync
- `/api/agent/heartbeat` - Register agent heartbeat

**Chat Endpoints:**
- `/api/agent/messages` - GET (read messages), POST (send message)

### 3. Response Format
All API responses use consistent format:
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "...",
    "requestId": "..."
  },
  "error": null | {
    "code": "...",
    "message": "..."
  }
}
```

### 4. Chat Message Model
```prisma
model AgentMessage {
  id        String   @id @default(cuid())
  role      String   // 'user' | 'agent'
  content   String
  metadata  String?  // JSON for proposed actions, etc.
  createdAt DateTime @default(now())
}
```

### 5. Agent API Key Model
```prisma
model AgentApiKey {
  id          String    @id @default(cuid())
  name        String
  key         String    @unique
  lastUsedAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?
}
```

## Implementation Approach

1. **Plan 07-01**: API key model, generation, middleware
2. **Plan 07-02**: Read endpoints (campaigns, keywords, metrics)
3. **Plan 07-03**: Action endpoints with safety limit enforcement
4. **Plan 07-04**: Chat message model and endpoints

## Key Design Decisions

1. **Single active key**: Support multiple keys but typically one active
2. **Audit all actions**: Every agent action logged with actorType='agent'
3. **Safety first**: All actions validate against safety limits before execution
4. **Simple chat**: Chat is minimal - just messages, no complex workflow
