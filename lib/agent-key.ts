import { randomBytes } from 'crypto'
import { prisma } from './prisma'
import type { AgentApiKey } from '@prisma/client'

// Generate a random API key
function generateKey(): string {
  return randomBytes(32).toString('hex')
}

// Create a new API key
export async function createApiKey(name: string): Promise<{ key: AgentApiKey; plainKey: string }> {
  const plainKey = generateKey()

  const key = await prisma.agentApiKey.create({
    data: {
      name,
      key: plainKey,
    },
  })

  return { key, plainKey }
}

// Validate an API key and update last used timestamp
export async function validateApiKey(key: string): Promise<AgentApiKey | null> {
  const apiKey = await prisma.agentApiKey.findUnique({
    where: { key },
  })

  if (!apiKey) {
    return null
  }

  // Check if revoked
  if (apiKey.revokedAt) {
    return null
  }

  // Update last used timestamp
  await prisma.agentApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  })

  return apiKey
}

// Revoke an API key
export async function revokeApiKey(id: string): Promise<void> {
  await prisma.agentApiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  })
}

// List all API keys (without exposing the actual key)
export async function listApiKeys(): Promise<Array<{
  id: string
  name: string
  keyPreview: string
  lastUsedAt: Date | null
  createdAt: Date
  revokedAt: Date | null
}>> {
  const keys = await prisma.agentApiKey.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return keys.map((key) => ({
    id: key.id,
    name: key.name,
    keyPreview: `****-****-${key.key.slice(-8)}`,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    revokedAt: key.revokedAt,
  }))
}

// Get a single API key by ID (without exposing the actual key)
export async function getApiKey(id: string): Promise<AgentApiKey | null> {
  return prisma.agentApiKey.findUnique({
    where: { id },
  })
}
