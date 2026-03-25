import Link from "next/link"
import { redirect } from "next/navigation"

import { JobModerationActions } from "@/components/job-moderation-actions"
import { listPendingSocialShoutouts, markSocialShoutoutFulfilled } from "@/lib/employer-add-ons"
import { getEmployerJobLifecycleStatus, getJobStatusLabel, isJobExpired } from "@/lib/job-listing-billing"
import { requirePageRoles } from "@/lib/page-auth"
import { listAllJobs } from "@/lib/jobs"

export const dynamic = "force-dynamic"

export default async function AdminJobsPage({
  searchParams
}: {
  searchParams: Promise<{
    shoutoutUpdated?: string
  }>
}) {
  const params = await searchParams
  await requirePageRoles(["admin"], "/admin/jobs")

  const [jobs, pendingSocialShoutouts] = await Promise.all([listAllJobs(), listPendingSocialShoutouts()])

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin job moderation</h1>
        <Link href="/admin/jobs/import" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Import batch JSON
        </Link>
      </div>
      {params.shoutoutUpdated === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Social shoutout marked fulfilled.</p>
      ) : null}

      <section className="space-y-3 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">Pending social shoutouts</h2>
          <p className="text-sm text-slate-600">Manual queue for paid social promotion purchases.</p>
        </div>
        {pendingSocialShoutouts.length === 0 ? <p className="text-sm text-slate-600">No pending social shoutouts.</p> : null}
        {pendingSocialShoutouts.map((purchase) => (
          <article key={purchase.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="space-y-2">
              <p className="font-medium text-slate-900">
                {purchase.companyName} • {purchase.jobTitle}
              </p>
              <p className="text-sm text-slate-600">Paid: {purchase.paidAt ? purchase.paidAt.toLocaleDateString() : "Pending Stripe confirmation"}</p>
              <p className="text-sm text-slate-600">
                Job page:{" "}
                <Link href={`/jobs/${purchase.jobSlug}`} className="underline underline-offset-4">
                  /jobs/{purchase.jobSlug}
                </Link>
              </p>
            </div>
            <form
              action={async () => {
                "use server"

                await requirePageRoles(["admin"], "/admin/jobs")
                await markSocialShoutoutFulfilled(purchase.id)
                redirect("/admin/jobs?shoutoutUpdated=1")
              }}
              className="mt-4"
            >
              <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
                Mark fulfilled
              </button>
            </form>
          </article>
        ))}
      </section>

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
              <JobModerationActions jobId={job.id} jobStatus={getEmployerJobLifecycleStatus(job)} canActivate={job.paymentStatus === "paid" && !isJobExpired(job)} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
