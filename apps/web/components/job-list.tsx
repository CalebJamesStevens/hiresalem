import { Fragment, type ReactNode } from "react"

import type { PublicJobSearchResult } from "@/lib/jobs"

import { JobCard } from "@/components/job-card"

export function JobList({
  jobs,
  savedJobIds = [],
  inlinePromo,
  showFeaturedSection = false,
  featuredSectionTitle = "Featured Spotlight",
  recentSectionLabel = "All Recent Openings"
}: {
  jobs: PublicJobSearchResult[]
  savedJobIds?: string[]
  inlinePromo?: ReactNode
  showFeaturedSection?: boolean
  featuredSectionTitle?: string
  recentSectionLabel?: string
}) {
  const savedSet = new Set(savedJobIds)
  const featuredJobs = showFeaturedSection ? jobs.filter((job) => job.isFeatured) : []
  const regularJobs = showFeaturedSection ? jobs.filter((job) => !job.isFeatured) : jobs
  const hasFeaturedSection = featuredJobs.length > 0
  const promoInsertIndex = inlinePromo ? Math.min(3, regularJobs.length) : -1

  return (
    <div className="min-w-0 space-y-4">
      {hasFeaturedSection ? (
        <details open className="group min-w-0 space-y-4">
          <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-1 py-1">
            <h2 className="text-2xl font-semibold text-slate-950">{featuredSectionTitle}</h2>
            <span className="text-sm font-medium text-slate-600 group-open:hidden">Show section</span>
            <span className="hidden text-sm font-medium text-slate-600 group-open:inline">Collapse</span>
          </summary>
          <div className="grid min-w-0 gap-4">
            {featuredJobs.map((job) => (
              <JobCard key={`featured-${job.id}`} job={job} initialSaved={savedSet.has(job.id)} />
            ))}
          </div>
        </details>
      ) : null}

      {hasFeaturedSection ? (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{recentSectionLabel}</p>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
      ) : null}

      <div className="grid min-w-0 gap-4">
        {regularJobs.map((job, index) => (
          <Fragment key={job.id}>
            {promoInsertIndex === index ? inlinePromo : null}
            <JobCard job={job} initialSaved={savedSet.has(job.id)} />
          </Fragment>
        ))}
        {promoInsertIndex === regularJobs.length ? inlinePromo : null}
      </div>
    </div>
  )
}
