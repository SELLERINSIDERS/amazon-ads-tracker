import { verifySession } from '@/lib/dal'
import { listRules, getRuleExecutions, RULE_TEMPLATES } from '@/lib/rules'
import { RulesTable } from './rules-table'
import { RuleTemplates } from './rule-templates'

export default async function RulesPage() {
  await verifySession()

  const [rules, executions] = await Promise.all([
    listRules(),
    getRuleExecutions(undefined, 20),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Automation Rules</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create rules to automatically adjust bids and manage keywords
        </p>
      </div>

      <RuleTemplates templates={RULE_TEMPLATES} />

      <RulesTable rules={rules} executions={executions} />
    </div>
  )
}
