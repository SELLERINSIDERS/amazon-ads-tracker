import Link from 'next/link'
import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { prisma } from '@/lib/prisma'
import { AdGroupsTable } from './ad-groups-table'
import { DateRangeSelector } from '@/components/date-range-selector'
import { Suspense } from 'react'

interface CampaignDetailPageProps {
  params: { id: string }
  searchParams: { range?: string }
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: CampaignDetailPageProps) {
  await verifySession()
  // Date range available via searchParams.range for future metrics display
  void searchParams.range

  const campaign = await prisma.campaign.findUnique({
    where: { id: params.id },
    include: {
      adGroups: {
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!campaign) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link href="/campaigns" className="hover:text-gray-700">
          Campaigns
        </Link>
        <span>/</span>
        <span className="text-gray-900">{campaign.name}</span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                campaign.state === 'enabled'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {campaign.state}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {campaign.type}
            </span>
            {/* SD-specific badges */}
            {campaign.type === 'SD' && campaign.tactic && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                {campaign.tactic === 'T00020' ? 'Product Targeting' : campaign.tactic === 'T00030' ? 'Audience' : campaign.tactic}
              </span>
            )}
            {campaign.type === 'SD' && campaign.costType && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {campaign.costType.toUpperCase()}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
            {campaign.budget && (
              <span>
                Budget: ${campaign.budget.toFixed(2)}/day
              </span>
            )}
            <span>{campaign.adGroups.length} ad groups</span>
            {/* SB-specific info */}
            {campaign.type === 'SB' && campaign.brandEntityId && (
              <span title={campaign.brandEntityId}>
                Brand Entity: {campaign.brandEntityId.substring(0, 12)}...
              </span>
            )}
          </div>
          {/* Quick links */}
          <div className="mt-3 flex items-center space-x-4">
            {(campaign.type === 'SP' || campaign.type === 'SB') && (
              <Link
                href={`/negative-keywords?campaignId=${campaign.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Negative Keywords
              </Link>
            )}
            <Link
              href={`/product-targets?campaignId=${campaign.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Product Targets
            </Link>
          </div>
        </div>
        <Suspense fallback={<div className="h-10 w-32 bg-gray-100 rounded animate-pulse" />}>
          <DateRangeSelector />
        </Suspense>
      </div>

      {/* Ad Groups */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ad Groups</h3>
        <AdGroupsTable
          adGroups={campaign.adGroups}
          campaignId={campaign.id}
          campaignType={campaign.type}
        />
      </div>
    </div>
  )
}
