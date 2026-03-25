import { CommunityLimitCard } from "@/components/community-limit-card"
import { LockedPlanFeatureCard } from "@/components/locked-plan-feature-card"
import { JobForm } from "@/components/job-form"
import { employerJobLockedFeatureIds, getLockedCompanyFeatures } from "@/lib/company-plan-ui"
import { getCompanyByOwnerAuthId, listCompanies } from "@/lib/companies"
import { hasRole } from "@/lib/authz"
import { getAvailableExtraSlotCredits } from "@/lib/employer-add-ons"
import { countFeaturedPublishedJobsForCompany, countPublishedJobsForCompany } from "@/lib/jobs"
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
  const [activeJobsCount, featuredJobsCount, extraSlotCredits] = company
    ? await Promise.all([countPublishedJobsForCompany(company.id), countFeaturedPublishedJobsForCompany(company.id), getAvailableExtraSlotCredits(company.id)])
    : [0, 0, 0]
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const featuredPlacementEligible = Boolean(resolvedPlan?.entitlements.allowsFeaturedJobs && resolvedPlan?.entitlements.allowsBoostedJobPlacement)
  const featuredJobsLimit = resolvedPlan?.entitlements.maxFeaturedJobs ?? null
  const allListingsFeatured = Boolean(resolvedPlan?.entitlements.maxFeaturedJobs === null && featuredPlacementEligible)
  const publishLimitReached = activeJobsLimit !== null && activeJobsCount >= activeJobsLimit + extraSlotCredits
  const lockedJobFeatures = resolvedPlan ? getLockedCompanyFeatures(resolvedPlan, employerJobLockedFeatureIds) : []
  const featuredSlotLockedMessage =
    !allListingsFeatured && featuredPlacementEligible && featuredJobsLimit !== null && featuredJobsCount >= featuredJobsLimit
      ? "Your Standard Spotlight slot is already in use. Remove featured placement from another live job or upgrade to Partner."
      : null

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Post a job</h1>
      {!isAdmin && !company ? (
        <p className="rounded border border-indigo-200 bg-indigo-50/40 px-4 py-3 text-sm text-slate-700">
          Finish your business setup before posting. <Link href="/become-business" className="underline">Create your company profile</Link>.
        </p>
      ) : company && resolvedPlan ? (
        <div className="space-y-4">
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
            <p className="mt-1">
              {resolvedPlan.entitlements.jobExpiresAfterDays === null
                ? "Listings stay live with no expiry while your subscription is active."
                : `Community listings expire after ${resolvedPlan.entitlements.jobExpiresAfterDays} days.`}
            </p>
            {allListingsFeatured ? (
              <p className="mt-1">Every Partner listing publishes with automatic Featured Spotlight placement.</p>
            ) : featuredPlacementEligible && featuredJobsLimit !== null ? (
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
      <JobForm
        disabled={!isAdmin && !company}
        isAdmin={isAdmin}
        existingCompanies={existingCompanies}
        postingCompanyName={company?.name ?? null}
        canSaveDraft={!isAdmin}
        canPublish={isAdmin || !publishLimitReached}
        publishDisabledMessage={publishLimitReached ? "You can still save drafts while you are at the Community plan limit." : null}
        listingExpiresAfterDays={isAdmin ? null : resolvedPlan?.entitlements.jobExpiresAfterDays ?? null}
        activeJobsCount={activeJobsCount}
        activeJobsLimit={activeJobsLimit}
        planLabel={resolvedPlan?.label ?? null}
        canFeatureJob={isAdmin || featuredPlacementEligible}
        featuredPlacementEligible={isAdmin || featuredPlacementEligible}
        featuredJobsCount={featuredJobsCount}
        featuredJobsLimit={featuredJobsLimit}
        allListingsFeatured={!isAdmin && allListingsFeatured}
        featuredSlotLockedMessage={featuredSlotLockedMessage}
      />
    </section>
  )
}
