import { prisma } from './prisma'
import type { AgentMessage } from '@prisma/client'

export type MessageRole = 'user' | 'agent'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  metadata: Record<string, unknown> | null
  createdAt: Date
}

// Get recent messages
export async function getMessages(
  limit: number = 50,
  before?: Date
): Promise<ChatMessage[]> {
  const messages = await prisma.agentMessage.findMany({
    where: before
      ? {
          createdAt: { lt: before },
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Return in chronological order
  return messages.reverse().map(formatMessage)
}

// Post a new message
export async function postMessage(
  role: MessageRole,
  content: string,
  metadata?: Record<string, unknown>
): Promise<ChatMessage> {
  const message = await prisma.agentMessage.create({
    data: {
      role,
      content,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })

  return formatMessage(message)
}

// Format database message to ChatMessage type
function formatMessage(message: AgentMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role as MessageRole,
    content: message.content,
    metadata: message.metadata ? JSON.parse(message.metadata) : null,
    createdAt: message.createdAt,
  }
}

// Get message count
export async function getMessageCount(): Promise<number> {
  return prisma.agentMessage.count()
}
