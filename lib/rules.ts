import { prisma } from './prisma'
import type { AutomationRule } from '@prisma/client'

export type ConditionType =
  | 'acos_above'
  | 'acos_below'
  | 'roas_above'
  | 'roas_below'
  | 'clicks_above'
  | 'impressions_above'
  | 'orders_below'
  | 'spend_above'

export type ActionType =
  | 'decrease_bid'
  | 'increase_bid'
  | 'pause'
  | 'enable'

export type EntityType = 'keyword' | 'campaign'

export interface CreateRuleInput {
  name: string
  description?: string
  conditionType: ConditionType
  conditionValue: number
  conditionEntity: EntityType
  actionType: ActionType
  actionValue?: number
  cooldownHours?: number
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  rule: CreateRuleInput
}

// Preset rule templates
export const RULE_TEMPLATES: RuleTemplate[] = [
  {
    id: 'high-acos-reducer',
    name: 'High ACoS Reducer',
    description: 'Decrease bid by 10% when ACoS exceeds 50%',
    rule: {
      name: 'High ACoS Reducer',
      description: 'Automatically reduce bids on keywords with ACoS above 50%',
      conditionType: 'acos_above',
      conditionValue: 50,
      conditionEntity: 'keyword',
      actionType: 'decrease_bid',
      actionValue: 10,
      cooldownHours: 24,
    },
  },
  {
    id: 'low-performance-pauser',
    name: 'Low Performance Pauser',
    description: 'Pause keywords with 100+ clicks but no orders',
    rule: {
      name: 'Low Performance Pauser',
      description: 'Pause keywords that get clicks but never convert',
      conditionType: 'orders_below',
      conditionValue: 1,
      conditionEntity: 'keyword',
      actionType: 'pause',
      cooldownHours: 168, // 1 week
    },
  },
  {
    id: 'winner-booster',
    name: 'Winner Booster',
    description: 'Increase bid by 5% when ROAS exceeds 3x',
    rule: {
      name: 'Winner Booster',
      description: 'Automatically boost bids on high-performing keywords',
      conditionType: 'roas_above',
      conditionValue: 3,
      conditionEntity: 'keyword',
      actionType: 'increase_bid',
      actionValue: 5,
      cooldownHours: 48,
    },
  },
]

// Create a new rule
export async function createRule(input: CreateRuleInput): Promise<AutomationRule> {
  return prisma.automationRule.create({
    data: {
      name: input.name,
      description: input.description,
      conditionType: input.conditionType,
      conditionValue: input.conditionValue,
      conditionEntity: input.conditionEntity,
      actionType: input.actionType,
      actionValue: input.actionValue,
      cooldownHours: input.cooldownHours ?? 24,
    },
  })
}

// Update a rule
export async function updateRule(
  id: string,
  input: Partial<CreateRuleInput>
): Promise<AutomationRule> {
  return prisma.automationRule.update({
    where: { id },
    data: input,
  })
}

// Delete a rule
export async function deleteRule(id: string): Promise<void> {
  await prisma.automationRule.delete({ where: { id } })
}

// List all rules
export async function listRules(): Promise<AutomationRule[]> {
  return prisma.automationRule.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

// Get a single rule
export async function getRule(id: string): Promise<AutomationRule | null> {
  return prisma.automationRule.findUnique({ where: { id } })
}

// Toggle rule enabled status
export async function toggleRule(id: string): Promise<AutomationRule> {
  const rule = await prisma.automationRule.findUnique({ where: { id } })
  if (!rule) throw new Error('Rule not found')

  return prisma.automationRule.update({
    where: { id },
    data: { enabled: !rule.enabled },
  })
}

// Get rule execution history
export async function getRuleExecutions(
  ruleId?: string,
  limit: number = 50
) {
  return prisma.ruleExecution.findMany({
    where: ruleId ? { ruleId } : undefined,
    orderBy: { executedAt: 'desc' },
    take: limit,
  })
}

// Format condition for display
export function formatCondition(rule: AutomationRule): string {
  const conditionMap: Record<string, string> = {
    acos_above: `ACoS > ${rule.conditionValue}%`,
    acos_below: `ACoS < ${rule.conditionValue}%`,
    roas_above: `ROAS > ${rule.conditionValue}`,
    roas_below: `ROAS < ${rule.conditionValue}`,
    clicks_above: `Clicks > ${rule.conditionValue}`,
    impressions_above: `Impressions > ${rule.conditionValue}`,
    orders_below: `Orders < ${rule.conditionValue}`,
    spend_above: `Spend > $${rule.conditionValue}`,
  }
  return conditionMap[rule.conditionType] || rule.conditionType
}

// Format action for display
export function formatAction(rule: AutomationRule): string {
  const actionMap: Record<string, string> = {
    decrease_bid: `Decrease bid by ${rule.actionValue}%`,
    increase_bid: `Increase bid by ${rule.actionValue}%`,
    pause: 'Pause',
    enable: 'Enable',
  }
  return actionMap[rule.actionType] || rule.actionType
}
