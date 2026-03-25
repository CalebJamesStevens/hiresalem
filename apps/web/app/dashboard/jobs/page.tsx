import { FeaturedJobBadge } from "@/components/featured-job-badge"
import Link from "next/link"

import { CommunityLimitCard } from "@/components/community-limit-card"
import { EmployerAddOnCheckoutButton } from "@/components/employer-add-on-checkout-button"
import { JobModerationActions } from "@/components/job-moderation-actions"
import { LockedPlanFeatureCard } from "@/components/locked-plan-feature-card"
import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { getAvailableExtraSlotCredits, getEmployerAddOnCheckoutErrorMessage, listCompanyEmployerAddOnPurchases, syncEmployerAddOnFromCheckoutSessionId } from "@/lib/employer-add-ons"
import { employerJobLockedFeatureIds, getLockedCompanyFeatures } from "@/lib/company-plan-ui"
import { isJobFeaturedForPlan } from "@/lib/featured-jobs"
import { getEmployerJobLifecycleStatus, getJobStatusLabel, isJobExpired, isJobPublished } from "@/lib/job-listing-billing"
import { listEmployerApplicantJobs } from "@/lib/applicants"
import { requirePageRoles } from "@/lib/page-auth"
import { resolveCompanyPlan } from "@repo/db/plans"

export const dynamic = "force-dynamic"

type DashboardJobsPageProps = {
  searchParams: Promise<{
    upgraded?: string
    addOn?: string
    addOnType?: string
    addOnError?: string
    session_id?: string
  }>
}

export default async function DashboardJobsPage({ searchParams }: DashboardJobsPageProps) {
  const params = await searchParams
  const now = new Date()
  const user = await requirePageRoles(["business", "admin"], "/dashboard/jobs")
  const isAdmin = hasRole(user.roles, "admin")
  const [jobs, company] = await Promise.all([
    listEmployerApplicantJobs({
      id: user.id,
      isAdmin
    }),
    isAdmin ? Promise.resolve(null) : getCompanyByOwnerAuthId(user.id)
  ])

  if (!isAdmin && params.addOn === "success" && params.session_id) {
    try {
      await syncEmployerAddOnFromCheckoutSessionId(params.session_id)
    } catch {
      // Webhook remains the source of truth.
    }
  }

  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const [extraSlotCredits, addOnPurchases] = company
    ? await Promise.all([getAvailableExtraSlotCredits(company.id), listCompanyEmployerAddOnPurchases(company.id)])
    : [0, []]
  const activeJobsCount = jobs.filter((job) => getEmployerJobLifecycleStatus(job) === "live").length
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const featuredPlacementEligible = Boolean(resolvedPlan?.entitlements.allowsFeaturedJobs && resolvedPlan?.entitlements.allowsBoostedJobPlacement)
  const featuredJobsLimit = resolvedPlan?.entitlements.maxFeaturedJobs ?? null
  const featuredJobsCount = jobs.filter(
    (job) => getEmployerJobLifecycleStatus(job) === "live" && job.isFeatured && (!job.featuredExpiresAt || job.featuredExpiresAt.getTime() <= now.getTime())
  ).length
  const allListingsFeatured = Boolean(resolvedPlan?.entitlements.maxFeaturedJobs === null && featuredPlacementEligible)
  const publishLimitReached = activeJobsLimit !== null && activeJobsCount >= activeJobsLimit + extraSlotCredits
  const lockedJobFeatures = resolvedPlan ? getLockedCompanyFeatures(resolvedPlan, employerJobLockedFeatureIds) : []
  const addOnErrorMessage = getEmployerAddOnCheckoutErrorMessage(params.addOnError)

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

      {params.addOn === "success" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Add-on checkout completed. Your job and billing state should update as soon as Stripe confirms the payment.
        </p>
      ) : null}

      {params.addOn === "canceled" ? (
        <p className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">Add-on checkout was canceled.</p>
      ) : null}

      {addOnErrorMessage ? <p className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{addOnErrorMessage}</p> : null}

      {!isAdmin && resolvedPlan ? (
        <div className="space-y-4">
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
            <p className="mt-1">
              {resolvedPlan.entitlements.jobExpiresAfterDays === null
                ? "Listings stay live with no expiry while your subscription remains active."
                : `Community listings expire after ${resolvedPlan.entitlements.jobExpiresAfterDays} days.`}{" "}
              Plan changes and add-ons are managed from{" "}
              <Link href="/dashboard/plan#pricing" className="underline underline-offset-4">
                your billing page
              </Link>
              .
            </p>
            {allListingsFeatured ? <p className="mt-1">Every Partner listing receives automatic Featured Spotlight placement.</p> : null}
            {!allListingsFeatured && featuredPlacementEligible && featuredJobsLimit !== null ? (
              <p className="mt-1">
                Spotlight slots in use:{" "}
                <span className="font-medium text-slate-900">
                  {featuredJobsCount} / {featuredJobsLimit}
                </span>
              </p>
            ) : null}
            {extraSlotCredits > 0 ? (
              <p className="mt-1">
                Extra slot credits available: <span className="font-medium text-slate-900">{extraSlotCredits}</span>
              </p>
            ) : null}
            {publishLimitReached ? (
              <p className="mt-2 text-amber-700">You’ve reached the Community plan live-job limit. Close one active listing before publishing another draft.</p>
            ) : null}
          </div>

          {lockedJobFeatures.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2">
              {lockedJobFeatures.map((feature) => (
                <LockedPlanFeatureCard key={feature.id} plan={resolvedPlan} featureId={feature.id} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      {publishLimitReached ? <CommunityLimitCard activeListings={activeJobsCount} /> : null}

      {jobs.length === 0 ? <p className="text-slate-600">No jobs found.</p> : null}

      <div className="space-y-3">
        {jobs.map((job) => {
          const isFeaturedVisible = isJobFeaturedForPlan(job, resolvedPlan)
          const hasActiveWeeklyFeature = Boolean(job.featuredExpiresAt && job.featuredExpiresAt.getTime() > now.getTime())
          const activeWeeklyFeatureEndsAt = hasActiveWeeklyFeature && job.featuredExpiresAt ? job.featuredExpiresAt.toLocaleDateString() : null
          const hasPendingWeeklyFeature = addOnPurchases.some(
            (purchase) => purchase.jobId === job.id && purchase.type === "weekly_feature" && purchase.status === "pending"
          )
          const hasPendingSocialShoutout = addOnPurchases.some(
            (purchase) => purchase.jobId === job.id && purchase.type === "social_shoutout" && purchase.status === "pending"
          )
          const hasQueuedSocialShoutout = addOnPurchases.some(
            (purchase) =>
              purchase.jobId === job.id &&
              purchase.type === "social_shoutout" &&
              purchase.status === "paid" &&
              !purchase.fulfilledAt
          )
          const canToggleManualFeatured = isAdmin
            ? true
            : !allListingsFeatured && (job.isFeatured || (featuredPlacementEligible && !isFeaturedVisible))

          return (
            <article key={job.id} className="rounded border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {isFeaturedVisible ? <FeaturedJobBadge inactive={false} /> : null}
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
                {activeWeeklyFeatureEndsAt ? (
                  <p className="text-sm text-slate-600">Weekly feature active until {activeWeeklyFeatureEndsAt}</p>
                ) : null}
                {hasPendingWeeklyFeature ? <p className="text-sm text-slate-600">Weekly feature checkout is waiting on payment confirmation.</p> : null}
                {hasPendingSocialShoutout ? <p className="text-sm text-slate-600">Social shoutout checkout is waiting on payment confirmation.</p> : null}
                {hasQueuedSocialShoutout ? (
                  <p className="text-sm text-slate-600">Social shoutout is queued for review.</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!isAdmin && getEmployerJobLifecycleStatus(job) === "live" ? (
                  <>
                    {!isFeaturedVisible && !hasPendingWeeklyFeature ? (
                      <EmployerAddOnCheckoutButton
                        addOnId="weekly_feature"
                        jobId={job.id}
                        label="Buy Weekly Feature"
                        className="rounded border px-4 py-2 text-sm font-medium text-slate-900"
                      />
                    ) : null}
                    {!hasPendingSocialShoutout && !hasQueuedSocialShoutout ? (
                      <EmployerAddOnCheckoutButton
                        addOnId="social_shoutout"
                        jobId={job.id}
                        label="Buy Social Shoutout"
                        className="rounded border px-4 py-2 text-sm font-medium text-slate-900"
                      />
                    ) : null}
                  </>
                ) : null}
                <JobModerationActions
                  jobId={job.id}
                  jobStatus={getEmployerJobLifecycleStatus(job)}
                  isFeatured={job.isFeatured}
                  canActivate={job.paymentStatus === "paid" && !isJobExpired(job) && (!publishLimitReached || job.isActive)}
                  canToggleFeatured={canToggleManualFeatured}
                />
              </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
