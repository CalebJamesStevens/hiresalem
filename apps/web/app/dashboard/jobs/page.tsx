import Link from "next/link"

import { JobModerationActions } from "@/components/job-moderation-actions"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { getEmployerJobLifecycleStatus, getJobStatusLabel, isJobExpired, isJobPublished } from "@/lib/job-listing-billing"
import { listEmployerApplicantJobs } from "@/lib/applicants"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"

export const dynamic = "force-dynamic"

type DashboardJobsPageProps = {
  searchParams: Promise<{
    upgraded?: string
  }>
}

export default async function DashboardJobsPage({ searchParams }: DashboardJobsPageProps) {
  const params = await searchParams
  const user = await requirePageRoles(["business", "admin"], "/dashboard/jobs")
  const isAdmin = hasRole(user.roles, "admin")
  const [jobs, company] = await Promise.all([
    listEmployerApplicantJobs({
      id: user.id,
      isAdmin
    }),
    isAdmin ? Promise.resolve(null) : getCompanyByOwnerAuthId(user.id)
  ])
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const activeJobsCount = jobs.filter((job) => getEmployerJobLifecycleStatus(job) === "live").length
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const publishLimitReached = activeJobsLimit !== null && activeJobsCount >= activeJobsLimit

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAdmin ? "All jobs" : "Your jobs"}</h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/company" className="rounded border bg-white px-4 py-2">
            Edit company
          </Link>
          <Link href="/post-job" className="rounded bg-slate-900 px-4 py-2 text-white">
            Post new job
          </Link>
        </div>
      </div>

      {params.upgraded === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your account is now a business account. You can post and manage jobs here.
        </p>
      ) : null}

      {!isAdmin && resolvedPlan ? (
        <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Current plan: <span className="font-medium text-slate-900">{resolvedPlan.label}</span>
          </p>
          <p className="mt-1">
            Live jobs:{" "}
            <span className="font-medium text-slate-900">
              {activeJobsCount}
              {activeJobsLimit !== null ? ` / ${activeJobsLimit}` : ""}
            </span>
          </p>
          <p className="mt-1">Free-plan jobs publish with standard visibility and use the standard listing duration.</p>
          {publishLimitReached ? (
            <p className="mt-2 text-amber-700">You’ve reached the Free plan limit. Close one live job before publishing another draft.</p>
          ) : null}
        </div>
      ) : null}

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
                  {job.location ?? "Salem, OR"} • {job.applyType} • {getJobStatusLabel(job)}
                </p>
                {job.expiresAt && isJobPublished(job) ? <p className="text-sm text-slate-600">Live until {job.expiresAt.toLocaleDateString()}</p> : null}
                <p className="text-sm text-slate-600">
                  <Link href={`/dashboard/applicants?jobId=${job.id}`} className="underline">
                    {job.applicationCount} applicant{job.applicationCount === 1 ? "" : "s"}
                  </Link>
                </p>
              </div>
              <JobModerationActions
                jobId={job.id}
                jobStatus={getEmployerJobLifecycleStatus(job)}
                canActivate={job.paymentStatus === "paid" && !isJobExpired(job) && (!publishLimitReached || job.isActive)}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
