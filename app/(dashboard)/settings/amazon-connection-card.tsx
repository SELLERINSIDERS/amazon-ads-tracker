'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { exchangeAuthCode, disconnectAmazon, type ConnectionStatus } from './actions'
import { ProfileSelector } from './profile-selector'

interface AmazonConnectionCardProps {
  connectionStatus: ConnectionStatus
  authUrl: string
}

function formatTimeUntil(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function AmazonConnectionCard({
  connectionStatus,
  authUrl,
}: AmazonConnectionCardProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [authCode, setAuthCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-submit code from URL if present
  useEffect(() => {
    const codeFromUrl = searchParams.get('amazon_code')
    if (codeFromUrl && !connectionStatus.connected && !isSubmitting) {
      setAuthCode(codeFromUrl)
      // Auto-submit the code
      const submitCode = async () => {
        setIsSubmitting(true)
        setError(null)
        const result = await exchangeAuthCode(codeFromUrl)
        if (!result.success) {
          setError(result.error || 'Failed to exchange authorization code')
        } else {
          // Clear the URL parameter and refresh
          router.replace('/settings')
        }
        setIsSubmitting(false)
      }
      submitCode()
    }
  }, [searchParams, connectionStatus.connected, isSubmitting, router])

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(authUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
      const input = document.querySelector('input[readonly]') as HTMLInputElement
      if (input) {
        input.select()
      }
    }
  }

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await exchangeAuthCode(authCode)

    if (!result.success) {
      setError(result.error || 'Failed to exchange authorization code')
    } else {
      setAuthCode('')
    }

    setIsSubmitting(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Amazon Ads account?')) {
      return
    }
    await disconnectAmazon()
  }

  if (connectionStatus.connected) {
    const expiresAt = connectionStatus.expiresAt ? new Date(connectionStatus.expiresAt) : null
    const isExpired = expiresAt ? expiresAt <= new Date() : false
    const timeUntilExpiry = expiresAt ? formatTimeUntil(expiresAt) : null

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Amazon Ads Connection
            </h3>
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Connected
              </span>
              {timeUntilExpiry && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isExpired
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  Token: {timeUntilExpiry}
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </div>

        {/* Token Health */}
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900">Token Health</h4>
          <dl className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                {isExpired ? 'Needs Refresh' : 'Active'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Expires In</dt>
              <dd className="font-medium text-gray-900">{timeUntilExpiry || 'Unknown'}</dd>
            </div>
            {connectionStatus.updatedAt && (
              <div className="col-span-2">
                <dt className="text-gray-500">Last Updated</dt>
                <dd className="font-medium text-gray-900">
                  {new Date(connectionStatus.updatedAt).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            Tokens auto-refresh 5 minutes before expiry during API calls.
          </p>
        </div>

        {/* Profile Selection */}
        <div className="mt-4 space-y-3">
          {connectionStatus.profileName ? (
            <div className="p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900">Selected Profile</h4>
              <p className="mt-1 text-sm text-gray-900">
                {connectionStatus.profileName}
                {connectionStatus.marketplace && (
                  <span className="text-gray-500">
                    {' '}
                    ({connectionStatus.marketplace})
                  </span>
                )}
              </p>
              <ProfileSelector currentProfileId={connectionStatus.profileId} />
            </div>
          ) : (
            <div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No profile selected. Select a profile below to start syncing data.
                </p>
              </div>
              <ProfileSelector currentProfileId={null} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900">
        Amazon Ads Connection
      </h3>
      <p className="mt-1 text-sm text-gray-500">
        Connect your Amazon Advertising account to sync campaign data.
      </p>

      <div className="mt-6 space-y-6">
        {/* Step 1: Authorization URL */}
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            Step 1: Authorize with Amazon
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            Click the link below to authorize this app with your Amazon Advertising
            account. After authorizing, you&apos;ll receive an authorization code.
          </p>
          <div className="mt-3 flex space-x-2">
            <Input
              readOnly
              value={authUrl}
              className="font-mono text-xs"
            />
            <Button variant="outline" onClick={handleCopyUrl}>
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="mt-2">
            <a
              href={authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Open Amazon Authorization Page →
            </a>
          </div>
        </div>

        {/* Step 2: Enter Authorization Code */}
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            Step 2: Enter Authorization Code
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            After authorizing, paste the authorization code from the URL or page.
            The code is valid for 5 minutes.
          </p>
          <form onSubmit={handleSubmitCode} className="mt-3">
            <div className="flex space-x-2">
              <Input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value)}
                placeholder="Paste authorization code here"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting || !authCode.trim()}>
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
