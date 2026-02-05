'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface SyncStatusData {
  connected: boolean
  status: 'idle' | 'syncing' | 'completed' | 'failed'
  lastSyncAt: string | null
  error: string | null
  campaignCount: number
}

export function SyncStatus() {
  const [data, setData] = useState<SyncStatusData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync/status')
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setData(result.data)
        setError(null)
      }
    } catch {
      setError('Failed to fetch sync status')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()

    // Poll every 5 seconds if syncing
    const interval = setInterval(() => {
      if (data?.status === 'syncing' || isSyncing) {
        fetchStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [data?.status, isSyncing, fetchStatus])

  const handleSync = async () => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/sync', { method: 'POST' })
      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        // Refresh status
        await fetchStatus()
      }
    } catch {
      setError('Failed to trigger sync')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Data Sync</h3>
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!data?.connected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Data Sync</h3>
        <p className="mt-2 text-sm text-gray-500">
          Connect your Amazon Ads account in Settings to enable data sync.
        </p>
      </div>
    )
  }

  const statusColors = {
    idle: 'bg-gray-100 text-gray-800',
    syncing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  const statusLabels = {
    idle: 'Idle',
    syncing: 'Syncing...',
    completed: 'Completed',
    failed: 'Failed',
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Data Sync</h3>
          <div className="mt-2 flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[data.status]
              }`}
            >
              {statusLabels[data.status]}
            </span>
            {data.campaignCount > 0 && (
              <span className="text-sm text-gray-600">
                {data.campaignCount} campaigns
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={handleSync}
          disabled={isSyncing || data.status === 'syncing'}
          size="sm"
        >
          {isSyncing || data.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div>
          <span className="text-gray-500">Last synced: </span>
          <span className="text-gray-900">
            {data.lastSyncAt
              ? new Date(data.lastSyncAt).toLocaleString()
              : 'Never'}
          </span>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        {data.error && data.status === 'failed' && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-red-600">
            Last sync failed: {data.error}
          </div>
        )}
      </div>
    </div>
  )
}
