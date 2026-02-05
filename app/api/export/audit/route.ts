import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { exportAuditLogCSV } from '@/lib/export'

export async function GET() {
  try {
    await verifySession()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const csv = await exportAuditLogCSV()
    const filename = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting audit log:', error)
    return NextResponse.json(
      { error: 'Failed to export audit log' },
      { status: 500 }
    )
  }
}
