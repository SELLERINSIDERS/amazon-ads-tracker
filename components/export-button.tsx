'use client'

interface ExportButtonProps {
  endpoint: string
  label?: string
}

export function ExportButton({ endpoint, label = 'Export CSV' }: ExportButtonProps) {
  const handleExport = () => {
    // Get current search params to include date range
    const searchParams = new URLSearchParams(window.location.search)
    const range = searchParams.get('range') || '30d'
    window.location.href = `${endpoint}?range=${range}`
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
    >
      {label}
    </button>
  )
}
