'use server'

import { prisma } from '@/lib/prisma'
import {
  exchangeCodeForTokens,
  calculateExpiresAt,
  generateAuthorizationUrl,
} from '@/lib/amazon'
import { getSafetyLimits, updateSafetyLimits } from '@/lib/safety'
import { createApiKey, revokeApiKey, listApiKeys } from '@/lib/agent-key'
import { revalidatePath } from 'next/cache'
import type { SafetyLimit, AgentApiKey } from '@prisma/client'

export interface ConnectionStatus {
  connected: boolean
  profileId: string | null
  profileName: string | null
  marketplace: string | null
  expiresAt: Date | null
  updatedAt: Date | null
}

// Get current Amazon connection status
export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const credential = await prisma.amazonCredential.findFirst({
    orderBy: { updatedAt: 'desc' },
  })

  if (!credential) {
    return {
      connected: false,
      profileId: null,
      profileName: null,
      marketplace: null,
      expiresAt: null,
      updatedAt: null,
    }
  }

  return {
    connected: true,
    profileId: credential.profileId,
    profileName: credential.profileName,
    marketplace: credential.marketplace,
    expiresAt: credential.expiresAt,
    updatedAt: credential.updatedAt,
  }
}

// Get OAuth authorization URL
export async function getAuthorizationUrl(): Promise<string> {
  return generateAuthorizationUrl()
}

// Exchange auth code for tokens and save to database
export async function exchangeAuthCode(
  authCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate auth code format (basic check)
    const trimmedCode = authCode.trim()
    if (!trimmedCode || trimmedCode.length < 10) {
      return { success: false, error: 'Invalid authorization code format' }
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(trimmedCode)

    // Calculate expiry time (with 5-minute buffer)
    const expiresAt = calculateExpiresAt(tokenResponse.expires_in)

    // Delete any existing credentials (single-user app)
    await prisma.amazonCredential.deleteMany({})

    // Save new credentials
    await prisma.amazonCredential.create({
      data: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      },
    })

    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Token exchange error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// Disconnect Amazon account
export async function disconnectAmazon(): Promise<{ success: boolean }> {
  await prisma.amazonCredential.deleteMany({})
  revalidatePath('/settings')
  return { success: true }
}

// Get safety limits
export async function getSafetyLimitsAction(): Promise<SafetyLimit> {
  return getSafetyLimits()
}

// Update safety limits
export async function updateSafetyLimitsAction(
  limits: Partial<Omit<SafetyLimit, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SafetyLimit> {
  const updated = await updateSafetyLimits(limits)
  revalidatePath('/settings')
  return updated
}

// Get all API keys
export async function getApiKeysAction() {
  return listApiKeys()
}

// Generate new API key
export async function generateApiKeyAction(
  name: string
): Promise<{ key: AgentApiKey; plainKey: string }> {
  const result = await createApiKey(name)
  revalidatePath('/settings')
  return result
}

// Revoke an API key
export async function revokeApiKeyAction(id: string): Promise<void> {
  await revokeApiKey(id)
  revalidatePath('/settings')
}
