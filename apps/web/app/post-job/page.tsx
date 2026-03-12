import { JobForm } from "@/components/job-form"
import { JOB_LISTING_DEFAULT_DAYS } from "@/lib/job-listing-billing"
import { getCompanyByOwnerAuthId, listCompanies } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { countPublishedJobsForCompany } from "@/lib/jobs"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"
import Link from "next/link"

type PostJobPageProps = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function PostJobPage({ searchParams }: PostJobPageProps) {
  await searchParams
  const user = await requirePageRoles(["business", "admin"], "/post-job")
  const isAdmin = hasRole(user.roles, "admin")
  const [company, existingCompanies] = await Promise.all([
    isAdmin ? Promise.resolve(null) : getCompanyByOwnerAuthId(user.id),
    isAdmin ? listCompanies() : Promise.resolve([])
  ])
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const activeJobsCount = company ? await countPublishedJobsForCompany(company.id) : 0
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const publishLimitReached = activeJobsLimit !== null && activeJobsCount >= activeJobsLimit
  const publishDisabledMessage = publishLimitReached
    ? `Free plan includes up to ${activeJobsLimit} live jobs. Close one live job before publishing another. You can still save drafts.`
    : null

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Post a job</h1>
      {!isAdmin && !company ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Finish your business setup before posting. <Link href="/become-business" className="underline">Create your company profile</Link>.
        </p>
      ) : company && resolvedPlan ? (
        <div className="space-y-2 rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Posting as <span className="font-medium text-slate-900">{company.name}</span> on the <span className="font-medium text-slate-900">{resolvedPlan.label}</span> plan.
          </p>
          <p>
            Live jobs:{" "}
            <span className="font-medium text-slate-900">
              {activeJobsCount}
              {activeJobsLimit !== null ? ` / ${activeJobsLimit}` : ""}
            </span>
          </p>
          <p>Free-plan listings publish at standard visibility and run for {JOB_LISTING_DEFAULT_DAYS} days by default.</p>
        </div>
      ) : null}
      {publishDisabledMessage ? <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{publishDisabledMessage}</p> : null}
      <JobForm
        disabled={!isAdmin && !company}
        requiresPayment={false}
        isAdmin={isAdmin}
        existingCompanies={existingCompanies}
        postingCompanyName={company?.name ?? null}
        canSaveDraft={!isAdmin}
        canPublish={isAdmin || !publishLimitReached}
        publishDisabledMessage={publishDisabledMessage}
        fixedListingDurationDays={!isAdmin ? JOB_LISTING_DEFAULT_DAYS : null}
        activeJobsCount={activeJobsCount}
        activeJobsLimit={activeJobsLimit}
        planLabel={resolvedPlan?.label ?? null}
      />
    </section>
  )
}
