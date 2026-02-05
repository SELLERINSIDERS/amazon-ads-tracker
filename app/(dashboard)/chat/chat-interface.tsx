'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { sendUserMessage, refreshMessages } from './actions'
import type { ChatMessage } from '@/lib/chat'

interface ChatInterfaceProps {
  initialMessages: ChatMessage[]
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date))
}

export function ChatInterface({ initialMessages }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newMessages = await refreshMessages()
        setMessages(newMessages)
      } catch (error) {
        console.error('Error refreshing messages:', error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const handleSend = () => {
    if (!input.trim() || isPending) return

    const userMessage = input.trim()
    setInput('')

    // Optimistically add user message
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      metadata: null,
      createdAt: new Date(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    startTransition(async () => {
      try {
        const result = await sendUserMessage(userMessage)
        // Replace optimistic message with actual message
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? result : m))
        )
      } catch (error) {
        console.error('Error sending message:', error)
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id))
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p>No messages yet</p>
              <p className="text-sm mt-1">
                Send a message or wait for your agent to respond
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.metadata && (
                  <div className="mt-2 pt-2 border-t border-opacity-20 border-current">
                    <p className="text-xs opacity-70">
                      {JSON.stringify(message.metadata, null, 2)}
                    </p>
                  </div>
                )}
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to your agent..."
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isPending}
          />
          <button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
