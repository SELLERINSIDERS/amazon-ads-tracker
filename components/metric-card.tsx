interface MetricCardProps {
  title: string
  value: string | number
  trend?: number | null
  format?: 'number' | 'currency' | 'percent'
  subtitle?: string
}

function formatValue(value: string | number, format?: string): string {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'number':
    default:
      return value.toLocaleString('en-US')
  }
}

export function MetricCard({ title, value, trend, format, subtitle }: MetricCardProps) {
  const formattedValue = formatValue(value, format)
  const trendColor =
    trend === null || trend === undefined
      ? 'text-gray-400'
      : trend >= 0
      ? 'text-green-600'
      : 'text-red-600'
  const trendIcon = trend !== null && trend !== undefined ? (trend >= 0 ? '↑' : '↓') : ''

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-gray-900">{formattedValue}</p>
      {trend !== null && trend !== undefined && (
        <p className={`mt-1 text-sm ${trendColor}`}>
          {trendIcon} {Math.abs(trend).toFixed(1)}% vs prev period
        </p>
      )}
      {subtitle && !trend && (
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      )}
    </div>
  )
}
