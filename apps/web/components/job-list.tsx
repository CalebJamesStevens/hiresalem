import type { PublicJobSearchResult } from "@/lib/jobs"

import { JobCard } from "@/components/job-card"

export function JobList({ jobs }: { jobs: PublicJobSearchResult[] }) {
  return (
    <div className="grid gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
