import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { getConnectionStatus } from '@/app/(dashboard)/settings/actions'
import { exportKeywordsCSV } from '@/lib/export'
import type { DateRangeKey } from '@/lib/types/date-range'

export async function GET(request: NextRequest) {
  try {
    await verifySession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = await getConnectionStatus()
  if (!connection.profileId) {
    return NextResponse.json(
      { error: 'No Amazon profile selected' },
      { status: 400 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const range = (searchParams.get('range') as DateRangeKey) || '30d'

  try {
    const csv = await exportKeywordsCSV(connection.profileId, range)
    const filename = `keywords_${range}_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting keywords:', error)
    return NextResponse.json(
      { error: 'Failed to export keywords' },
      { status: 500 }
    )
  }
}
