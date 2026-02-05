import { Suspense } from 'react'
import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { getAuditLog, getAuditLogCount } from '@/lib/audit'
import type { ActionType, EntityType, ActorType } from '@/lib/types/audit'
import { AuditFilters } from './audit-filters'
import { AuditTable } from './audit-table'

interface AuditPageProps {
  searchParams: {
    actionType?: string
    entityType?: string
    actorType?: string
    page?: string
  }
}

const PAGE_SIZE = 50

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await verifySession()

  const page = Math.max(1, parseInt(searchParams.page || '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const filters = {
    actionType: searchParams.actionType as ActionType | undefined,
    entityType: searchParams.entityType as EntityType | undefined,
    actorType: searchParams.actorType as ActorType | undefined,
    limit: PAGE_SIZE,
    offset,
  }

  const [entries, totalCount] = await Promise.all([
    getAuditLog(filters),
    getAuditLogCount(filters),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link href="/settings" className="hover:text-gray-700">
          Settings
        </Link>
        <span>/</span>
        <span className="text-gray-900">Audit Log</span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
          <p className="mt-1 text-sm text-gray-500">
            View all actions taken on your campaigns, keywords, and settings
          </p>
        </div>
        <a
          href="/api/export/audit"
          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      <Suspense fallback={<div className="h-12 bg-gray-100 rounded animate-pulse" />}>
        <AuditFilters
          currentActionType={searchParams.actionType}
          currentEntityType={searchParams.entityType}
          currentActorType={searchParams.actorType}
        />
      </Suspense>

      <AuditTable entries={entries} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg">
          <div className="flex flex-1 justify-between sm:hidden">
            {page > 1 ? (
              <Link
                href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Previous
              </Link>
            ) : (
              <span />
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{offset + 1}</span> to{' '}
                <span className="font-medium">{Math.min(offset + PAGE_SIZE, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span> entries
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                {page > 1 && (
                  <Link
                    href={`?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No audit entries found</p>
          <p className="text-sm text-gray-400 mt-1">
            Actions will appear here as you make changes to campaigns and keywords
          </p>
        </div>
      )}
    </div>
  )
}
