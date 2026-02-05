'use server'

import { prisma } from '@/lib/prisma'
import {
  exchangeCodeForTokens,
  calculateExpiresAt,
  generateAuthorizationUrl,
} from '@/lib/amazon'
import { getSafetyLimits, updateSafetyLimits } from '@/lib/safety'
import { createApiKey, revokeApiKey, listApiKeys, getApiKey } from '@/lib/agent-key'
import { logAction } from '@/lib/audit'
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
  const current = await getSafetyLimits()
  const updated = await updateSafetyLimits(limits)

  // Log safety limit update
  await logAction({
    actorType: 'user',
    actionType: 'safety_limit_update',
    entityType: 'safety_limit',
    entityId: updated.id,
    entityName: 'Safety Limits',
    beforeState: {
      maxBidChangePct: current.maxBidChangePct,
      maxBudgetChangePct: current.maxBudgetChangePct,
      maxDailySpend: current.maxDailySpend,
      minBidFloor: current.minBidFloor,
      maxBidCeiling: current.maxBidCeiling,
    },
    afterState: {
      maxBidChangePct: updated.maxBidChangePct,
      maxBudgetChangePct: updated.maxBudgetChangePct,
      maxDailySpend: updated.maxDailySpend,
      minBidFloor: updated.minBidFloor,
      maxBidCeiling: updated.maxBidCeiling,
    },
  })

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

  // Log API key creation
  await logAction({
    actorType: 'user',
    actionType: 'api_key_create',
    entityType: 'api_key',
    entityId: result.key.id,
    entityName: name,
    afterState: {
      name: result.key.name,
      createdAt: result.key.createdAt,
    },
  })

  revalidatePath('/settings')
  return result
}

// Revoke an API key
export async function revokeApiKeyAction(id: string): Promise<void> {
  const existingKey = await getApiKey(id)

  await revokeApiKey(id)

  // Log API key revocation
  if (existingKey) {
    await logAction({
      actorType: 'user',
      actionType: 'api_key_revoke',
      entityType: 'api_key',
      entityId: id,
      entityName: existingKey.name,
      beforeState: {
        name: existingKey.name,
        createdAt: existingKey.createdAt,
        lastUsedAt: existingKey.lastUsedAt,
      },
      afterState: {
        revokedAt: new Date(),
      },
    })
  }

  revalidatePath('/settings')
}
