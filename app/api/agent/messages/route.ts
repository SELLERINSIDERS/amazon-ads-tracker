import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { getMessages, postMessage } from '@/lib/chat'

// Get messages
export async function GET(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const beforeStr = searchParams.get('before')
    const before = beforeStr ? new Date(beforeStr) : undefined

    const messages = await getMessages(Math.min(limit, 100), before)

    return apiResponse({
      messages,
      count: messages.length,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return apiError('FETCH_ERROR', 'Failed to fetch messages', 500)
  }
}

// Post a message
export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const { content, metadata } = body

    if (!content || typeof content !== 'string') {
      return apiError('INVALID_INPUT', 'content is required', 400)
    }

    // Agent always posts as 'agent' role
    const message = await postMessage('agent', content, metadata)

    return apiResponse({ message })
  } catch (error) {
    console.error('Error posting message:', error)
    return apiError('POST_ERROR', 'Failed to post message', 500)
  }
}
