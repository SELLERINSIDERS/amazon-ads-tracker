import { prisma } from './prisma'
import type { AuditEntry } from '@prisma/client'
import type {
  CreateAuditEntry,
  AuditFilters,
  AuditEntryDisplay,
  ActorType,
  ActionType,
  EntityType,
} from './types/audit'

// Log an action to the audit trail
export async function logAction(entry: CreateAuditEntry): Promise<AuditEntry> {
  return prisma.auditEntry.create({
    data: {
      actorType: entry.actorType,
      actorId: entry.actorId,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityName: entry.entityName,
      beforeState: entry.beforeState ? JSON.stringify(entry.beforeState) : null,
      afterState: entry.afterState ? JSON.stringify(entry.afterState) : null,
      reason: entry.reason,
      success: entry.success ?? true,
      errorMsg: entry.errorMsg,
    },
  })
}

// Get audit log entries with optional filters
export async function getAuditLog(filters: AuditFilters = {}): Promise<AuditEntryDisplay[]> {
  const where: Record<string, unknown> = {}

  if (filters.actionType) {
    where.actionType = filters.actionType
  }

  if (filters.entityType) {
    where.entityType = filters.entityType
  }

  if (filters.entityId) {
    where.entityId = filters.entityId
  }

  if (filters.actorType) {
    where.actorType = filters.actorType
  }

  if (filters.startDate || filters.endDate) {
    where.timestamp = {}
    if (filters.startDate) {
      (where.timestamp as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (where.timestamp as Record<string, Date>).lte = filters.endDate
    }
  }

  const entries = await prisma.auditEntry.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters.limit ?? 100,
    skip: filters.offset ?? 0,
  })

  return entries.map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    actorType: entry.actorType as ActorType,
    actorId: entry.actorId,
    actionType: entry.actionType as ActionType,
    entityType: entry.entityType as EntityType,
    entityId: entry.entityId,
    entityName: entry.entityName,
    beforeState: entry.beforeState ? JSON.parse(entry.beforeState) : null,
    afterState: entry.afterState ? JSON.parse(entry.afterState) : null,
    reason: entry.reason,
    success: entry.success,
    errorMsg: entry.errorMsg,
  }))
}

// Get audit entry count for pagination
export async function getAuditLogCount(filters: AuditFilters = {}): Promise<number> {
  const where: Record<string, unknown> = {}

  if (filters.actionType) {
    where.actionType = filters.actionType
  }

  if (filters.entityType) {
    where.entityType = filters.entityType
  }

  if (filters.actorType) {
    where.actorType = filters.actorType
  }

  if (filters.startDate || filters.endDate) {
    where.timestamp = {}
    if (filters.startDate) {
      (where.timestamp as Record<string, Date>).gte = filters.startDate
    }
    if (filters.endDate) {
      (where.timestamp as Record<string, Date>).lte = filters.endDate
    }
  }

  return prisma.auditEntry.count({ where })
}

// Helper to format action type for display
export function formatActionType(actionType: string): string {
  const formatted = actionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return formatted
}

// Helper to format actor type for display
export function formatActorType(actorType: string): string {
  const map: Record<string, string> = {
    user: 'User',
    agent: 'AI Agent',
    rule: 'Automation Rule',
    system: 'System',
  }
  return map[actorType] || actorType
}
