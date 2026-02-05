import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from './agent-key'
import type { AgentApiKey } from '@prisma/client'

export interface AgentContext {
  apiKey: AgentApiKey
}

// Standard API error response format
export function apiError(
  code: string,
  message: string,
  status: number = 400
): NextResponse {
  return NextResponse.json(
    {
      data: null,
      meta: { timestamp: new Date().toISOString() },
      error: { code, message },
    },
    { status }
  )
}

// Standard API success response format
export function apiResponse<T>(
  data: T,
  meta: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
    error: null,
  })
}

// Validate agent API key from request headers
export async function validateAgentRequest(
  request: NextRequest
): Promise<{ valid: true; context: AgentContext } | { valid: false; error: NextResponse }> {
  const apiKey = request.headers.get('X-Agent-Key')

  if (!apiKey) {
    return {
      valid: false,
      error: apiError('MISSING_API_KEY', 'X-Agent-Key header is required', 401),
    }
  }

  const validKey = await validateApiKey(apiKey)

  if (!validKey) {
    return {
      valid: false,
      error: apiError('INVALID_API_KEY', 'Invalid or revoked API key', 401),
    }
  }

  return {
    valid: true,
    context: { apiKey: validKey },
  }
}

// Helper to wrap agent API route handlers with auth
export function withAgentAuth<T>(
  handler: (request: NextRequest, context: AgentContext) => Promise<T>
) {
  return async (request: NextRequest) => {
    const authResult = await validateAgentRequest(request)

    if (!authResult.valid) {
      return authResult.error
    }

    return handler(request, authResult.context)
  }
}
