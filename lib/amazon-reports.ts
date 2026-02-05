/**
 * Amazon Advertising Reports API
 *
 * Fetches performance metrics (impressions, clicks, cost, sales, orders)
 * for campaigns and keywords using async report generation.
 */

import { getClientId, AMAZON_API_ENDPOINTS, type AmazonRegion } from './amazon'
import { withRateLimit } from './rate-limiter'

const DEFAULT_REGION: AmazonRegion = 'NA'

interface ReportOptions {
  accessToken: string
  profileId: string
  region?: AmazonRegion
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

interface ReportResponse {
  reportId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  statusDetails?: string
  url?: string
}

interface CampaignMetricRow {
  campaignId: string
  date: string
  impressions: number
  clicks: number
  cost: number
  purchases30d: number
  sales30d: number
}

interface KeywordMetricRow {
  keywordId: string
  adGroupId: string
  campaignId: string
  date: string
  impressions: number
  clicks: number
  cost: number
  purchases30d: number
  sales30d: number
}

interface ProductTargetMetricRow {
  targetId: string
  adGroupId: string
  campaignId: string
  date: string
  impressions: number
  clicks: number
  cost: number
  purchases30d: number
  sales30d: number
}

function getHeaders(accessToken: string, profileId: string): HeadersInit {
  return {
    'Amazon-Advertising-API-ClientId': getClientId(),
    'Amazon-Advertising-API-Scope': profileId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
    Accept: 'application/vnd.createasyncreportrequest.v3+json',
  }
}

// Wait for specified milliseconds
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

type ReportType =
  | 'spCampaigns' | 'spKeywords' | 'spTargets'
  | 'sbCampaigns' | 'sbKeywords' | 'sbTargets'
  | 'sdCampaigns' | 'sdTargets'

type AdProduct = 'SPONSORED_PRODUCTS' | 'SPONSORED_BRANDS' | 'SPONSORED_DISPLAY'

// Create a report request
async function createReport(
  opts: ReportOptions,
  reportType: ReportType
): Promise<string> {
  const { accessToken, profileId, region = DEFAULT_REGION, startDate, endDate } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const metrics = [
    'impressions',
    'clicks',
    'cost',
    'purchases30d',
    'sales30d',
  ]

  // Map report type to ad product
  const adProductMap: Record<string, AdProduct> = {
    spCampaigns: 'SPONSORED_PRODUCTS',
    spKeywords: 'SPONSORED_PRODUCTS',
    spTargets: 'SPONSORED_PRODUCTS',
    sbCampaigns: 'SPONSORED_BRANDS',
    sbKeywords: 'SPONSORED_BRANDS',
    sbTargets: 'SPONSORED_BRANDS',
    sdCampaigns: 'SPONSORED_DISPLAY',
    sdTargets: 'SPONSORED_DISPLAY',
  }

  const adProduct = adProductMap[reportType]

  // Determine columns based on report type
  let columns: string[]
  let groupBy: string[]

  if (reportType.endsWith('Campaigns')) {
    columns = ['campaignId', 'date', ...metrics]
    groupBy = ['campaign']
  } else if (reportType.endsWith('Keywords')) {
    columns = ['keywordId', 'adGroupId', 'campaignId', 'date', ...metrics]
    groupBy = ['campaign', 'keyword']
  } else {
    // Targets
    columns = ['targetId', 'adGroupId', 'campaignId', 'date', ...metrics]
    groupBy = ['campaign', 'targeting']
  }

  const body = {
    name: `${reportType}_${Date.now()}`,
    startDate,
    endDate,
    configuration: {
      adProduct,
      groupBy,
      columns,
      reportTypeId: reportType,
      timeUnit: 'DAILY',
      format: 'GZIP_JSON',
    },
  }

  const response = await withRateLimit(() =>
    fetch(`${baseUrl}/reporting/reports`, {
      method: 'POST',
      headers: getHeaders(accessToken, profileId),
      body: JSON.stringify(body),
    })
  )

  if (!response.ok) {
    const error = await response.text()
    console.error(`Create ${reportType} report error:`, error)
    throw new Error(`Failed to create ${reportType} report: ${error}`)
  }

  const data: ReportResponse = await response.json()
  return data.reportId
}

// Check report status
async function getReportStatus(
  opts: ReportOptions,
  reportId: string
): Promise<ReportResponse> {
  const { accessToken, profileId, region = DEFAULT_REGION } = opts
  const baseUrl = AMAZON_API_ENDPOINTS[region]

  const response = await withRateLimit(() =>
    fetch(`${baseUrl}/reporting/reports/${reportId}`, {
      method: 'GET',
      headers: {
        'Amazon-Advertising-API-ClientId': getClientId(),
        'Amazon-Advertising-API-Scope': profileId,
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.createasyncreportrequest.v3+json',
      },
    })
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get report status: ${error}`)
  }

  return response.json()
}

// Download and decompress report
async function downloadReport<T>(url: string): Promise<T[]> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download report: ${response.status}`)
  }

  // The report is GZIP compressed JSON
  const arrayBuffer = await response.arrayBuffer()

  // Decompress using DecompressionStream (available in Node 18+)
  const decompressedStream = new Response(
    new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'))
  )

  const text = await decompressedStream.text()

  // Parse JSON lines or JSON array
  try {
    return JSON.parse(text)
  } catch {
    // Handle JSON lines format
    return text
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
  }
}

// Wait for report to complete with polling
async function waitForReport(
  opts: ReportOptions,
  reportId: string,
  maxWaitMs: number = 600000 // 10 minutes - Amazon reports can take a while
): Promise<string | null> {
  const startTime = Date.now()
  let pollInterval = 5000 // Start with 5 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getReportStatus(opts, reportId)

    console.log(`[Reports] Report ${reportId} status: ${status.status}`)

    if (status.status === 'COMPLETED' && status.url) {
      return status.url
    }

    if (status.status === 'FAILED') {
      console.error(`[Reports] Report failed: ${status.statusDetails || 'Unknown error'}`)
      return null
    }

    await sleep(pollInterval)
    // Increase poll interval up to 15 seconds
    pollInterval = Math.min(pollInterval * 1.2, 15000)
  }

  console.warn(`[Reports] Report ${reportId} timed out after ${maxWaitMs}ms`)
  return null
}

// Fetch campaign metrics for a date range
export async function fetchCampaignMetrics(
  opts: ReportOptions
): Promise<CampaignMetricRow[]> {
  console.log(`[Reports] Creating campaign metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'spCampaigns')
    console.log(`[Reports] Campaign report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] Campaign report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading campaign report...`)
    const data = await downloadReport<CampaignMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} campaign metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] Campaign metrics error:', error)
    return []
  }
}

// Fetch keyword metrics for a date range
export async function fetchKeywordMetrics(
  opts: ReportOptions
): Promise<KeywordMetricRow[]> {
  console.log(`[Reports] Creating keyword metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'spKeywords')
    console.log(`[Reports] Keyword report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] Keyword report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading keyword report...`)
    const data = await downloadReport<KeywordMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} keyword metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] Keyword metrics error:', error)
    return []
  }
}

// ============= SB Campaign Metrics =============

export async function fetchSBCampaignMetrics(
  opts: ReportOptions
): Promise<CampaignMetricRow[]> {
  console.log(`[Reports] Creating SB campaign metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'sbCampaigns')
    console.log(`[Reports] SB Campaign report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SB Campaign report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SB campaign report...`)
    const data = await downloadReport<CampaignMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SB campaign metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SB Campaign metrics error:', error)
    return []
  }
}

// ============= SD Campaign Metrics =============

export async function fetchSDCampaignMetrics(
  opts: ReportOptions
): Promise<CampaignMetricRow[]> {
  console.log(`[Reports] Creating SD campaign metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'sdCampaigns')
    console.log(`[Reports] SD Campaign report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SD Campaign report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SD campaign report...`)
    const data = await downloadReport<CampaignMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SD campaign metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SD Campaign metrics error:', error)
    return []
  }
}

// ============= SB Keyword Metrics =============

export async function fetchSBKeywordMetrics(
  opts: ReportOptions
): Promise<KeywordMetricRow[]> {
  console.log(`[Reports] Creating SB keyword metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'sbKeywords')
    console.log(`[Reports] SB Keyword report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SB Keyword report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SB keyword report...`)
    const data = await downloadReport<KeywordMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SB keyword metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SB Keyword metrics error:', error)
    return []
  }
}

// ============= Product Target Metrics =============

export async function fetchSPProductTargetMetrics(
  opts: ReportOptions
): Promise<ProductTargetMetricRow[]> {
  console.log(`[Reports] Creating SP target metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'spTargets')
    console.log(`[Reports] SP Target report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SP Target report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SP target report...`)
    const data = await downloadReport<ProductTargetMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SP target metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SP Target metrics error:', error)
    return []
  }
}

export async function fetchSBProductTargetMetrics(
  opts: ReportOptions
): Promise<ProductTargetMetricRow[]> {
  console.log(`[Reports] Creating SB target metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'sbTargets')
    console.log(`[Reports] SB Target report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SB Target report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SB target report...`)
    const data = await downloadReport<ProductTargetMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SB target metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SB Target metrics error:', error)
    return []
  }
}

export async function fetchSDProductTargetMetrics(
  opts: ReportOptions
): Promise<ProductTargetMetricRow[]> {
  console.log(`[Reports] Creating SD target metrics report for ${opts.startDate} to ${opts.endDate}`)

  try {
    const reportId = await createReport(opts, 'sdTargets')
    console.log(`[Reports] SD Target report ID: ${reportId}`)

    const downloadUrl = await waitForReport(opts, reportId)

    if (!downloadUrl) {
      console.warn('[Reports] SD Target report did not complete in time')
      return []
    }

    console.log(`[Reports] Downloading SD target report...`)
    const data = await downloadReport<ProductTargetMetricRow>(downloadUrl)
    console.log(`[Reports] Downloaded ${data.length} SD target metric rows`)

    return data
  } catch (error) {
    console.error('[Reports] SD Target metrics error:', error)
    return []
  }
}

// ============= Aggregated Metrics Fetchers =============

export async function fetchAllCampaignMetrics(
  opts: ReportOptions
): Promise<CampaignMetricRow[]> {
  const [sp, sb, sd] = await Promise.all([
    fetchCampaignMetrics(opts),
    fetchSBCampaignMetrics(opts),
    fetchSDCampaignMetrics(opts),
  ])

  return [...sp, ...sb, ...sd]
}

export async function fetchAllKeywordMetrics(
  opts: ReportOptions
): Promise<KeywordMetricRow[]> {
  const [sp, sb] = await Promise.all([
    fetchKeywordMetrics(opts),
    fetchSBKeywordMetrics(opts),
  ])

  return [...sp, ...sb]
}

export async function fetchAllProductTargetMetrics(
  opts: ReportOptions
): Promise<ProductTargetMetricRow[]> {
  const [sp, sb, sd] = await Promise.all([
    fetchSPProductTargetMetrics(opts),
    fetchSBProductTargetMetrics(opts),
    fetchSDProductTargetMetrics(opts),
  ])

  return [...sp, ...sb, ...sd]
}

// Helper to get date string in YYYY-MM-DD format
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Get date range for last N days
export function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - 1) // Yesterday (data may not be available for today)

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}
