'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RuleTemplate } from '@/lib/rules'
import { createRuleFromTemplateAction } from './actions'

interface RuleTemplatesProps {
  templates: RuleTemplate[]
}

export function RuleTemplates({ templates }: RuleTemplatesProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleUseTemplate = (template: RuleTemplate) => {
    startTransition(async () => {
      await createRuleFromTemplateAction(template.id)
      router.refresh()
    })
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Quick Start Templates</h3>
        <p className="text-sm text-gray-500 mt-1">
          Use a preset template to get started quickly
        </p>
      </div>
      <div className="p-4 grid gap-4 sm:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            <p className="mt-1 text-sm text-gray-500">{template.description}</p>
            <button
              onClick={() => handleUseTemplate(template)}
              disabled={isPending}
              className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Use Template'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
