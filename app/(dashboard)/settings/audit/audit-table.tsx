'use client'

import { useState } from 'react'
import { formatActionType, formatActorType } from '@/lib/audit'
import type { AuditEntryDisplay } from '@/lib/types/audit'

interface AuditTableProps {
  entries: AuditEntryDisplay[]
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function StateDiff({
  beforeState,
  afterState,
}: {
  beforeState: Record<string, unknown> | null
  afterState: Record<string, unknown> | null
}) {
  if (!beforeState && !afterState) {
    return <span className="text-gray-400">No state captured</span>
  }

  const allKeys = new Set([
    ...Object.keys(beforeState || {}),
    ...Object.keys(afterState || {}),
  ])

  const changes: { key: string; before: unknown; after: unknown }[] = []

  allKeys.forEach((key) => {
    const before = beforeState?.[key]
    const after = afterState?.[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({ key, before, after })
    }
  })

  if (changes.length === 0) {
    return <span className="text-gray-400">No changes detected</span>
  }

  return (
    <div className="space-y-1">
      {changes.map(({ key, before, after }) => (
        <div key={key} className="text-xs">
          <span className="font-medium text-gray-700">{key}:</span>{' '}
          <span className="text-red-600 line-through">
            {before !== undefined ? JSON.stringify(before) : 'null'}
          </span>{' '}
          <span className="text-green-600">
            {after !== undefined ? JSON.stringify(after) : 'null'}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AuditTable({ entries }: AuditTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actor
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Action
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Entity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map((entry) => (
            <>
              <tr
                key={entry.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              >
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {formatTimestamp(entry.timestamp)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      entry.actorType === 'user'
                        ? 'bg-blue-100 text-blue-800'
                        : entry.actorType === 'agent'
                          ? 'bg-purple-100 text-purple-800'
                          : entry.actorType === 'rule'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {formatActorType(entry.actorType)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {formatActionType(entry.actionType)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="text-gray-900">{entry.entityName || entry.entityId}</div>
                  <div className="text-xs text-gray-500">{entry.entityType}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  {entry.success ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Failed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-800">
                    {expandedId === entry.id ? 'Hide' : 'Show'}
                  </button>
                </td>
              </tr>
              {expandedId === entry.id && (
                <tr key={`${entry.id}-details`} className="bg-gray-50">
                  <td colSpan={6} className="px-4 py-4">
                    <div className="space-y-3">
                      {entry.reason && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            Reason:
                          </span>
                          <p className="mt-1 text-sm text-gray-700">{entry.reason}</p>
                        </div>
                      )}
                      {entry.errorMsg && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            Error:
                          </span>
                          <p className="mt-1 text-sm text-red-600">{entry.errorMsg}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          Changes:
                        </span>
                        <div className="mt-1">
                          <StateDiff
                            beforeState={entry.beforeState}
                            afterState={entry.afterState}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Entry ID: {entry.id}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
