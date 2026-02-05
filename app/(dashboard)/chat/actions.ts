'use server'

import { getMessages, postMessage, type ChatMessage } from '@/lib/chat'

export async function sendUserMessage(content: string): Promise<ChatMessage> {
  return postMessage('user', content)
}

export async function refreshMessages(): Promise<ChatMessage[]> {
  return getMessages(50)
}
