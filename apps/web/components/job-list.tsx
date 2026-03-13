import type { PublicJobSearchResult } from "@/lib/jobs"

import { JobCard } from "@/components/job-card"

export function JobList({ jobs, savedJobIds = [] }: { jobs: PublicJobSearchResult[]; savedJobIds?: string[] }) {
  const savedSet = new Set(savedJobIds)

  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} initialSaved={savedSet.has(job.id)} />
      ))}
    </div>
  )
}
