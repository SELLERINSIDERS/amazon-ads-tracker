import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { runRule, runAllRules } from '@/lib/rules-executor'
import { getRule } from '@/lib/rules'

export async function POST(request: NextRequest) {
  // Verify user session (not agent - manual execution)
  try {
    await verifySession()
  } catch {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get connection status
  const connection = await getConnectionStatus()
  if (!connection.profileId) {
    return NextResponse.json(
      { error: 'No Amazon profile selected' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    const { ruleId } = body

    if (ruleId) {
      // Run single rule
      const rule = await getRule(ruleId)
      if (!rule) {
        return NextResponse.json(
          { error: 'Rule not found' },
          { status: 404 }
        )
      }

      const results = await runRule(rule, connection.profileId)
      return NextResponse.json({
        success: true,
        ruleId,
        results,
        summary: {
          total: results.length,
          success: results.filter((r) => r.result === 'success').length,
          skipped: results.filter((r) => r.result === 'skipped').length,
          failed: results.filter((r) => r.result === 'failed').length,
        },
      })
    } else {
      // Run all enabled rules
      const results = await runAllRules(connection.profileId)
      const summary: Record<string, {
        total: number
        success: number
        skipped: number
        failed: number
      }> = {}

      results.forEach((ruleResults, rId) => {
        summary[rId] = {
          total: ruleResults.length,
          success: ruleResults.filter((r) => r.result === 'success').length,
          skipped: ruleResults.filter((r) => r.result === 'skipped').length,
          failed: ruleResults.filter((r) => r.result === 'failed').length,
        }
      })

      return NextResponse.json({
        success: true,
        summary,
      })
    }
  } catch (error) {
    console.error('Error executing rules:', error)
    return NextResponse.json(
      { error: 'Failed to execute rules' },
      { status: 500 }
    )
  }
}
