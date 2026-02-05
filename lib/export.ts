import type { DateRangeKey } from './types/date-range'
import { getCampaignsWithMetrics, getKeywordsWithMetrics } from './metrics'
import { getAuditLog } from './audit'

// Convert array of objects to CSV string
function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return ''

  // Header row
  const header = columns.map((c) => `"${c.label}"`).join(',')

  // Data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const value = item[col.key]
        if (value === null || value === undefined) return '""'
        if (typeof value === 'number') return value.toString()
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(',')
  })

  return [header, ...rows].join('\n')
}

// Export campaigns to CSV
export async function exportCampaignsCSV(
  profileId: string,
  range: DateRangeKey = '30d'
): Promise<string> {
  const campaigns = await getCampaignsWithMetrics(profileId, range)

  return toCSV(campaigns, [
    { key: 'id', label: 'Campaign ID' },
    { key: 'name', label: 'Campaign Name' },
    { key: 'type', label: 'Type' },
    { key: 'state', label: 'Status' },
    { key: 'budget', label: 'Daily Budget' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR %' },
    { key: 'cost', label: 'Spend' },
    { key: 'cpc', label: 'CPC' },
    { key: 'orders', label: 'Orders' },
    { key: 'sales', label: 'Sales' },
    { key: 'acos', label: 'ACoS %' },
    { key: 'roas', label: 'ROAS' },
  ])
}

// Export keywords to CSV
export async function exportKeywordsCSV(
  profileId: string,
  range: DateRangeKey = '30d'
): Promise<string> {
  const keywords = await getKeywordsWithMetrics(profileId, range)

  return toCSV(keywords, [
    { key: 'id', label: 'Keyword ID' },
    { key: 'keywordText', label: 'Keyword' },
    { key: 'campaignName', label: 'Campaign' },
    { key: 'adGroupName', label: 'Ad Group' },
    { key: 'matchType', label: 'Match Type' },
    { key: 'state', label: 'Status' },
    { key: 'bid', label: 'Bid' },
    { key: 'impressions', label: 'Impressions' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'ctr', label: 'CTR %' },
    { key: 'cost', label: 'Spend' },
    { key: 'cpc', label: 'CPC' },
    { key: 'orders', label: 'Orders' },
    { key: 'sales', label: 'Sales' },
    { key: 'acos', label: 'ACoS %' },
    { key: 'roas', label: 'ROAS' },
  ])
}

// Export audit log to CSV
export async function exportAuditLogCSV(): Promise<string> {
  const entries = await getAuditLog({ limit: 1000 })

  return toCSV(
    entries.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
      beforeState: e.beforeState ? JSON.stringify(e.beforeState) : '',
      afterState: e.afterState ? JSON.stringify(e.afterState) : '',
    })),
    [
      { key: 'id', label: 'Entry ID' },
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'actorType', label: 'Actor Type' },
      { key: 'actorId', label: 'Actor ID' },
      { key: 'actionType', label: 'Action Type' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'entityId', label: 'Entity ID' },
      { key: 'entityName', label: 'Entity Name' },
      { key: 'reason', label: 'Reason' },
      { key: 'success', label: 'Success' },
      { key: 'errorMsg', label: 'Error Message' },
      { key: 'beforeState', label: 'Before State' },
      { key: 'afterState', label: 'After State' },
    ]
  )
}
