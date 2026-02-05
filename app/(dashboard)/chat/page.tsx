import { Suspense } from 'react'
import { verifySession } from '@/lib/dal'
import { getMessages } from '@/lib/chat'
import { ChatInterface } from './chat-interface'

export default async function ChatPage() {
  await verifySession()

  const messages = await getMessages(50)

  return (
    <div className="h-[calc(100vh-12rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Agent Chat</h2>
        <p className="mt-1 text-sm text-gray-500">
          Communicate with your AI agent and review proposed actions
        </p>
      </div>

      <Suspense fallback={<div className="h-full bg-gray-100 rounded-lg animate-pulse" />}>
        <ChatInterface initialMessages={messages} />
      </Suspense>
    </div>
  )
}
