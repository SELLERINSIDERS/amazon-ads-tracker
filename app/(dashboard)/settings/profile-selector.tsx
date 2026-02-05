'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { AmazonProfile } from '@/lib/amazon'

interface ProfileSelectorProps {
  currentProfileId: string | null
}

export function ProfileSelector({ currentProfileId }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<AmazonProfile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState(currentProfileId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/amazon/profiles')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load profiles')
      }

      setProfiles(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!selectedProfileId) return

    const profile = profiles.find(
      (p) => String(p.profileId) === selectedProfileId
    )
    if (!profile) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/amazon/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.profileId,
          profileName: profile.accountInfo?.name,
          countryCode: profile.countryCode,
          marketplace: `Amazon ${profile.countryCode}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      // Reload page to show updated profile
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">Loading profiles...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadProfiles}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          No advertising profiles found. Make sure your Amazon account has
          advertising access enabled.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label
          htmlFor="profile-select"
          className="block text-sm font-medium text-gray-700"
        >
          Select Advertising Profile
        </label>
        <select
          id="profile-select"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Choose a profile...</option>
          {profiles.map((profile) => (
            <option key={profile.profileId} value={String(profile.profileId)}>
              {profile.accountInfo?.name || 'Unknown'} ({profile.countryCode}) -{' '}
              {profile.accountInfo?.type}
            </option>
          ))}
        </select>
      </div>

      <Button
        onClick={handleSaveProfile}
        disabled={!selectedProfileId || isSaving}
      >
        {isSaving ? 'Saving...' : 'Save Profile'}
      </Button>
    </div>
  )
}
