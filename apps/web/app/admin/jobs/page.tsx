import Link from "next/link"

import { JobModerationActions } from "@/components/job-moderation-actions"
import { getJobStatusLabel, isJobExpired } from "@/lib/job-listing-billing"
import { requirePageRoles } from "@/lib/page-auth"
import { listAllJobs } from "@/lib/jobs"

export const dynamic = "force-dynamic"

export default async function AdminJobsPage() {
  await requirePageRoles(["admin"], "/admin/jobs")

  const jobs = await listAllJobs()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Admin job moderation</h1>
      {jobs.length === 0 ? <p className="text-slate-600">No jobs found.</p> : null}

      <div className="space-y-3">
        {jobs.map((job) => (
          <article key={job.id} className="rounded border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/jobs/${job.slug}`} className="font-semibold underline">
                  {job.title}
                </Link>
                <p className="text-sm text-slate-600">
                  {job.ownerAuthId} • {job.applyType} • {getJobStatusLabel(job)}
                </p>
                {job.expiresAt ? <p className="text-sm text-slate-600">Paid through {job.expiresAt.toLocaleDateString()}</p> : null}
              </div>
              <JobModerationActions jobId={job.id} isActive={job.isActive} canReopen={job.paymentStatus === "paid" && !isJobExpired(job)} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
