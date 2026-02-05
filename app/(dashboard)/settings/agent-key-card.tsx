'use client'

import { useState, useTransition } from 'react'
import { generateApiKeyAction, revokeApiKeyAction } from './actions'

interface ApiKeyDisplay {
  id: string
  name: string
  keyPreview: string
  lastUsedAt: Date | null
  createdAt: Date
  revokedAt: Date | null
}

interface AgentKeyCardProps {
  initialKeys: ApiKeyDisplay[]
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

export function AgentKeyCard({ initialKeys }: AgentKeyCardProps) {
  const [isPending, startTransition] = useTransition()
  const [keys, setKeys] = useState(initialKeys)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = () => {
    if (!newKeyName.trim()) {
      setError('Please enter a name for the API key')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await generateApiKeyAction(newKeyName.trim())
        setNewKey(result.plainKey)
        setKeys((prev) => [
          {
            id: result.key.id,
            name: result.key.name,
            keyPreview: `****-****-${result.plainKey.slice(-8)}`,
            lastUsedAt: null,
            createdAt: result.key.createdAt,
            revokedAt: null,
          },
          ...prev,
        ])
        setNewKeyName('')
        setShowGenerateForm(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate key')
      }
    })
  }

  const handleRevoke = (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
      return
    }

    startTransition(async () => {
      try {
        await revokeApiKeyAction(id)
        setKeys((prev) =>
          prev.map((key) =>
            key.id === id ? { ...key, revokedAt: new Date() } : key
          )
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke key')
      }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const activeKeys = keys.filter((k) => !k.revokedAt)
  const revokedKeys = keys.filter((k) => k.revokedAt)

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Agent API Keys</h3>
          <p className="mt-2 text-sm text-gray-500">
            Generate API keys for external AI agents to access your data
          </p>
        </div>
        {!showGenerateForm && (
          <button
            onClick={() => setShowGenerateForm(true)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Generate New Key
          </button>
        )}
      </div>

      {/* New key display */}
      {newKey && (
        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
          <p className="text-sm font-medium text-green-800">
            New API key generated. Copy it now - you will not see it again!
          </p>
          <div className="mt-2 flex items-center space-x-2">
            <code className="flex-1 p-2 bg-white rounded border text-sm font-mono">
              {newKey}
            </code>
            <button
              onClick={() => copyToClipboard(newKey)}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Copy
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Generate form */}
      {showGenerateForm && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <label className="block text-sm font-medium text-gray-700">
            Key Name
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Claude Agent"
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Generating...' : 'Generate'}
            </button>
            <button
              onClick={() => {
                setShowGenerateForm(false)
                setNewKeyName('')
              }}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Active keys */}
      {activeKeys.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700">Active Keys</h4>
          <div className="mt-2 space-y-2">
            {activeKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{key.name}</p>
                  <p className="text-xs text-gray-500">
                    {key.keyPreview} • Last used: {formatDate(key.lastUsedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={isPending}
                  className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-500">Revoked Keys</h4>
          <div className="mt-2 space-y-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-gray-100 rounded-md opacity-60"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700 line-through">
                    {key.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Revoked {formatDate(key.revokedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeKeys.length === 0 && revokedKeys.length === 0 && (
        <div className="mt-4 text-center py-4 text-sm text-gray-500">
          No API keys yet. Generate one to allow agents to access your data.
        </div>
      )}
    </div>
  )
}
