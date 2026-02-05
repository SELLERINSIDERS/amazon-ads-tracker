// Audit action types
export type ActionType =
  | 'bid_change'
  | 'budget_change'
  | 'status_change'
  | 'keyword_add'
  | 'keyword_remove'
  | 'campaign_create'
  | 'campaign_delete'
  | 'ad_group_create'
  | 'ad_group_delete'
  | 'target_add'
  | 'target_remove'
  | 'sync_triggered'
  | 'rule_create'
  | 'rule_toggle'
  | 'rule_delete'
  | 'safety_limit_update'
  | 'api_key_create'
  | 'api_key_revoke'

// Entity types that can be audited
export type EntityType = 'campaign' | 'keyword' | 'ad_group' | 'product_target' | 'profile' | 'rule' | 'safety_limit' | 'api_key'

// Actor types - who performed the action
export type ActorType = 'user' | 'agent' | 'rule' | 'system'

// Input for creating a new audit entry
export interface CreateAuditEntry {
  actorType: ActorType
  actorId?: string
  actionType: ActionType
  entityType: EntityType
  entityId: string
  entityName?: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  reason?: string
  success?: boolean
  errorMsg?: string
}

// Filters for querying audit log
export interface AuditFilters {
  actionType?: ActionType
  entityType?: EntityType
  entityId?: string
  actorType?: ActorType
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// Formatted audit entry for display
export interface AuditEntryDisplay {
  id: string
  timestamp: Date
  actorType: ActorType
  actorId: string | null
  actionType: ActionType
  entityType: EntityType
  entityId: string
  entityName: string | null
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
  reason: string | null
  success: boolean
  errorMsg: string | null
}
