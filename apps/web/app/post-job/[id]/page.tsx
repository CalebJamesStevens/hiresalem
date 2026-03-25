import { CommunityLimitCard } from "@/components/community-limit-card"
import Link from "next/link"
import { redirect } from "next/navigation"

import { JobForm } from "@/components/job-form"
import { LockedPlanFeatureCard } from "@/components/locked-plan-feature-card"
import { hasRole } from "@/lib/authz"
import { getAvailableExtraSlotCredits } from "@/lib/employer-add-ons"
import { employerJobLockedFeatureIds, getLockedCompanyFeatures } from "@/lib/company-plan-ui"
import { getCompanyById, listCompanies } from "@/lib/companies"
import { getEmployerJobLifecycleStatus, getJobStatusLabel, isJobPublished } from "@/lib/job-listing-billing"
import { getJobById } from "@/lib/jobs"
import { countFeaturedPublishedJobsForCompany, countPublishedJobsForCompany } from "@/lib/jobs"
import { requirePageRoles } from "@/lib/page-auth"
import { inferJobLocationFromLegacyText } from "@/lib/structured-data"
import { resolveCompanyPlan } from "@repo/db/plans"

type EditJobPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditJobPage({ params }: EditJobPageProps) {
  const { id } = await params
  const user = await requirePageRoles(["business", "admin"], `/post-job/${id}`)
  const isAdmin = hasRole(user.roles, "admin")
  const [job, existingCompanies] = await Promise.all([getJobById(id), isAdmin ? listCompanies() : Promise.resolve([])])

  if (!job) {
    redirect("/dashboard/jobs")
  }

  if (!isAdmin && job.ownerAuthId !== user.id) {
    redirect("/dashboard/jobs")
  }

  const company = job.companyId ? await getCompanyById(job.companyId) : null
  const inferredJobLocation = inferJobLocationFromLegacyText(job.location)
  const resolvedPlan = company ? resolveCompanyPlan(company) : null
  const [activeJobsCount, featuredJobsCount, extraSlotCredits] = company
    ? await Promise.all([
        countPublishedJobsForCompany(company.id),
        countFeaturedPublishedJobsForCompany(company.id, {
          excludeJobId: job.isFeatured ? job.id : null
        }),
        getAvailableExtraSlotCredits(company.id)
      ])
    : [0, 0, 0]
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const featuredPlacementEligible = Boolean(resolvedPlan?.entitlements.allowsFeaturedJobs && resolvedPlan?.entitlements.allowsBoostedJobPlacement)
  const featuredJobsLimit = resolvedPlan?.entitlements.maxFeaturedJobs ?? null
  const allListingsFeatured = Boolean(resolvedPlan?.entitlements.maxFeaturedJobs === null && featuredPlacementEligible)
  const lifecycleStatus = getEmployerJobLifecycleStatus(job)
  const publishLimitReached = !isJobPublished(job) && activeJobsLimit !== null && activeJobsCount >= activeJobsLimit + extraSlotCredits
  const lockedJobFeatures = resolvedPlan ? getLockedCompanyFeatures(resolvedPlan, employerJobLockedFeatureIds) : []
  const publishDisabledMessage = publishLimitReached ? "Close an active Community listing before publishing this draft." : null
  const featuredSlotLockedMessage =
    !job.isFeatured && !allListingsFeatured && featuredPlacementEligible && featuredJobsLimit !== null && featuredJobsCount >= featuredJobsLimit
      ? "Your Standard Spotlight slot is already in use. Remove featured placement from another live job or upgrade to Partner."
      : null

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Edit job</h1>
        <p className="text-sm text-slate-600">Update the listing content, preview it, then save changes.</p>
        {!isAdmin && resolvedPlan ? (
          <p className="text-sm text-slate-600">
            Current plan: {resolvedPlan.label}. Job status: <span className="font-medium text-slate-900">{getJobStatusLabel(job)}</span>.
          </p>
        ) : null}
        <p className="text-sm text-slate-600">
          <Link href={`/jobs/${job.slug}`} className="underline underline-offset-4">
            View current job page
          </Link>
        </p>
      </div>

      {!isAdmin && resolvedPlan && lockedJobFeatures.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {lockedJobFeatures.map((feature) => (
            <LockedPlanFeatureCard key={feature.id} plan={resolvedPlan} featureId={feature.id} />
          ))}
        </section>
      ) : null}

      {publishLimitReached ? <CommunityLimitCard activeListings={activeJobsCount} /> : null}

      <JobForm
        disabled={false}
        isAdmin={isAdmin}
        existingCompanies={existingCompanies}
        postingCompanyName={company?.name ?? null}
        canSaveDraft={!isAdmin && lifecycleStatus === "draft"}
        canPublish={isAdmin || lifecycleStatus !== "draft" ? true : !publishLimitReached}
        publishDisabledMessage={lifecycleStatus === "draft" ? publishDisabledMessage : null}
        listingExpiresAfterDays={isAdmin ? null : resolvedPlan?.entitlements.jobExpiresAfterDays ?? null}
        activeJobsCount={activeJobsCount}
        activeJobsLimit={activeJobsLimit}
        planLabel={resolvedPlan?.label ?? null}
        initialStatus={lifecycleStatus}
        canFeatureJob={isAdmin || featuredPlacementEligible || job.isFeatured}
        featuredPlacementEligible={isAdmin || featuredPlacementEligible}
        featuredJobsCount={featuredJobsCount}
        featuredJobsLimit={featuredJobsLimit}
        allListingsFeatured={!isAdmin && allListingsFeatured}
        featuredSlotLockedMessage={featuredSlotLockedMessage}
        initialValues={{
          id: job.id,
          slug: job.slug,
          title: job.title,
          location: job.location,
          jobLocationCity: job.jobLocationCity ?? inferredJobLocation?.city ?? null,
          jobLocationRegion: job.jobLocationRegion ?? inferredJobLocation?.region ?? null,
          jobLocationCountry: job.jobLocationCountry ?? inferredJobLocation?.country ?? null,
          streetAddress: job.streetAddress,
          postalCode: job.postalCode,
          salary: job.salary,
          workMode: job.workMode,
          employmentType: job.employmentType,
          category: job.category,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: job.salaryCurrency,
          salaryInterval: job.salaryInterval,
          description: job.description,
          applyType: job.applyType,
          applyUrl: job.applyUrl,
          isFeatured: job.isFeatured,
          listingDurationDays: job.listingDurationDays,
          companyId: job.companyId
        }}
      />
    </section>
  )
}
