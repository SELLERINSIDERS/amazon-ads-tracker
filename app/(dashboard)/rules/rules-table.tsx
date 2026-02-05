'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AutomationRule, RuleExecution } from '@prisma/client'
import { formatCondition, formatAction } from '@/lib/rules'
import { toggleRuleAction, deleteRuleAction, executeRulesAction } from './actions'

interface RulesTableProps {
  rules: AutomationRule[]
  executions: RuleExecution[]
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function RulesTable({ rules: initialRules, executions }: RulesTableProps) {
  const router = useRouter()
  const [rules, setRules] = useState(initialRules)
  const [isPending, startTransition] = useTransition()
  const [executeMessage, setExecuteMessage] = useState<string | null>(null)

  const handleRunAll = () => {
    setExecuteMessage(null)
    startTransition(async () => {
      const result = await executeRulesAction()
      setExecuteMessage(
        result.success
          ? `${result.message} (${result.results?.success} success, ${result.results?.skipped} skipped, ${result.results?.failed} failed)`
          : result.message
      )
      router.refresh()
    })
  }

  const handleToggle = (ruleId: string) => {
    startTransition(async () => {
      const updated = await toggleRuleAction(ruleId)
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? updated : r))
      )
    })
  }

  const handleDelete = (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    startTransition(async () => {
      await deleteRuleAction(ruleId)
      setRules((prev) => prev.filter((r) => r.id !== ruleId))
    })
  }

  return (
    <div className="space-y-6">
      {/* Run All Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleRunAll}
          disabled={isPending || rules.filter((r) => r.enabled).length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? 'Running...' : 'Run All Enabled Rules'}
        </button>
        {executeMessage && (
          <span className="text-sm text-gray-600">{executeMessage}</span>
        )}
      </div>

      {/* Rules List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Your Rules</h3>
        </div>

        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No rules created yet.</p>
            <p className="text-sm mt-1">
              Use a template above or create a custom rule.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {rules.map((rule) => (
              <li key={rule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        {rule.name}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          rule.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {rule.conditionEntity}
                      </span>
                    </div>
                    {rule.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {rule.description}
                      </p>
                    )}
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">IF</span>{' '}
                      {formatCondition(rule)}{' '}
                      <span className="font-medium">THEN</span>{' '}
                      {formatAction(rule)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Cooldown: {rule.cooldownHours}h • Executions:{' '}
                      {rule.executionCount} • Last run:{' '}
                      {formatDate(rule.lastExecutedAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggle(rule.id)}
                      disabled={isPending}
                      className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent Executions */}
      {executions.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Recent Executions
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {executions.map((exec) => (
              <li key={exec.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-900">
                      {exec.entityName || exec.entityId}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({exec.entityType})
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        exec.result === 'success'
                          ? 'bg-green-100 text-green-800'
                          : exec.result === 'skipped'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {exec.result}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(exec.executedAt)}
                    </span>
                  </div>
                </div>
                {exec.message && (
                  <p className="mt-1 text-xs text-gray-500">{exec.message}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
