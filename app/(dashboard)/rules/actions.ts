'use server'

import {
  createRule,
  toggleRule,
  deleteRule,
  getRule,
  RULE_TEMPLATES,
} from '@/lib/rules'
import { runRule, runAllRules } from '@/lib/rules-executor'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { logAction } from '@/lib/audit'
import type { AutomationRule } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function createRuleFromTemplateAction(
  templateId: string
): Promise<AutomationRule> {
  const template = RULE_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error('Template not found')
  }

  const rule = await createRule(template.rule)

  // Log rule creation
  await logAction({
    actorType: 'user',
    actionType: 'rule_create',
    entityType: 'rule',
    entityId: rule.id,
    entityName: rule.name,
    afterState: {
      name: rule.name,
      conditionType: rule.conditionType,
      conditionValue: rule.conditionValue,
      actionType: rule.actionType,
      actionValue: rule.actionValue,
      enabled: rule.enabled,
    },
  })

  revalidatePath('/rules')
  return rule
}

export async function toggleRuleAction(ruleId: string): Promise<AutomationRule> {
  const existingRule = await getRule(ruleId)
  const rule = await toggleRule(ruleId)

  // Log rule toggle
  await logAction({
    actorType: 'user',
    actionType: 'rule_toggle',
    entityType: 'rule',
    entityId: rule.id,
    entityName: rule.name,
    beforeState: { enabled: existingRule?.enabled },
    afterState: { enabled: rule.enabled },
  })

  revalidatePath('/rules')
  return rule
}

export async function deleteRuleAction(ruleId: string): Promise<void> {
  const existingRule = await getRule(ruleId)

  await deleteRule(ruleId)

  // Log rule deletion
  if (existingRule) {
    await logAction({
      actorType: 'user',
      actionType: 'rule_delete',
      entityType: 'rule',
      entityId: ruleId,
      entityName: existingRule.name,
      beforeState: {
        name: existingRule.name,
        conditionType: existingRule.conditionType,
        conditionValue: existingRule.conditionValue,
        actionType: existingRule.actionType,
        enabled: existingRule.enabled,
      },
    })
  }

  revalidatePath('/rules')
}

export async function executeRulesAction(ruleId?: string): Promise<{
  success: boolean
  message: string
  results?: { success: number; skipped: number; failed: number }
}> {
  const connection = await getConnectionStatus()
  if (!connection.profileId) {
    return { success: false, message: 'No Amazon profile selected' }
  }

  try {
    if (ruleId) {
      const rule = await getRule(ruleId)
      if (!rule) {
        return { success: false, message: 'Rule not found' }
      }

      const results = await runRule(rule, connection.profileId)
      revalidatePath('/rules')

      return {
        success: true,
        message: `Rule executed: ${results.length} entities processed`,
        results: {
          success: results.filter((r) => r.result === 'success').length,
          skipped: results.filter((r) => r.result === 'skipped').length,
          failed: results.filter((r) => r.result === 'failed').length,
        },
      }
    } else {
      const allResults = await runAllRules(connection.profileId)
      let total = 0
      let success = 0
      let skipped = 0
      let failed = 0

      allResults.forEach((results) => {
        total += results.length
        success += results.filter((r) => r.result === 'success').length
        skipped += results.filter((r) => r.result === 'skipped').length
        failed += results.filter((r) => r.result === 'failed').length
      })

      revalidatePath('/rules')

      return {
        success: true,
        message: `All rules executed: ${total} entities processed`,
        results: { success, skipped, failed },
      }
    }
  } catch (error) {
    console.error('Error executing rules:', error)
    return { success: false, message: 'Failed to execute rules' }
  }
}
