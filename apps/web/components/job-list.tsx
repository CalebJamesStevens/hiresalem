import { Fragment, type ReactNode } from "react"

import type { PublicJobSearchResult } from "@/lib/jobs"

import { JobCard } from "@/components/job-card"

export function JobList({
  jobs,
  savedJobIds = [],
  inlinePromo
}: {
  jobs: PublicJobSearchResult[]
  savedJobIds?: string[]
  inlinePromo?: ReactNode
}) {
  const savedSet = new Set(savedJobIds)
  const promoInsertIndex = inlinePromo ? Math.min(3, jobs.length) : -1

  return (
    <div className="grid gap-4">
      {jobs.map((job, index) => (
        <Fragment key={job.id}>
          {promoInsertIndex === index ? inlinePromo : null}
          <JobCard job={job} initialSaved={savedSet.has(job.id)} />
        </Fragment>
      ))}
      {promoInsertIndex === jobs.length ? inlinePromo : null}
    </div>
  )
}
