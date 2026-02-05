import { NextRequest } from 'next/server'
import { validateAgentRequest, apiResponse, apiError } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // Validate API key
  const authResult = await validateAgentRequest(request)
  if (!authResult.valid) {
    return authResult.error
  }

  try {
    const body = await request.json()
    const status = body.status || 'active'

    // Create heartbeat record
    const heartbeat = await prisma.agentHeartbeat.create({
      data: {
        agentKeyId: authResult.context.apiKey.id,
        status,
      },
    })

    return apiResponse({
      recorded: true,
      timestamp: heartbeat.timestamp,
    })
  } catch (error) {
    console.error('Error recording heartbeat:', error)
    return apiError('HEARTBEAT_ERROR', 'Failed to record heartbeat', 500)
  }
}
