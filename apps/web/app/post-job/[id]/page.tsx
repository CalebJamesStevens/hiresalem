import Link from "next/link"
import { redirect } from "next/navigation"

import { JobForm } from "@/components/job-form"
import { LockedPlanFeatureCard } from "@/components/locked-plan-feature-card"
import { hasRole } from "@/lib/authz"
import { employerJobLockedFeatureIds, getLockedCompanyFeatures } from "@/lib/company-plan-ui"
import { getCompanyById, listCompanies } from "@/lib/companies"
import { getEmployerJobLifecycleStatus, getJobStatusLabel, isJobPublished } from "@/lib/job-listing-billing"
import { getJobById } from "@/lib/jobs"
import { countPublishedJobsForCompany } from "@/lib/jobs"
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
  const activeJobsCount = company ? await countPublishedJobsForCompany(company.id) : 0
  const activeJobsLimit = resolvedPlan?.entitlements.maxActiveJobs ?? null
  const lifecycleStatus = getEmployerJobLifecycleStatus(job)
  const publishLimitReached = !isJobPublished(job) && activeJobsLimit !== null && activeJobsCount >= activeJobsLimit
  const lockedJobFeatures = resolvedPlan ? getLockedCompanyFeatures(resolvedPlan, employerJobLockedFeatureIds) : []
  const publishDisabledMessage = publishLimitReached
    ? `Free plan includes up to ${activeJobsLimit} live jobs. Close one live job before publishing this one.`
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

      <JobForm
        disabled={false}
        requiresPayment={false}
        isAdmin={isAdmin}
        existingCompanies={existingCompanies}
        postingCompanyName={company?.name ?? null}
        canSaveDraft={!isAdmin && lifecycleStatus === "draft"}
        canPublish={isAdmin || lifecycleStatus !== "draft" ? true : !publishLimitReached}
        publishDisabledMessage={lifecycleStatus === "draft" ? publishDisabledMessage : null}
        fixedListingDurationDays={!isAdmin ? job.listingDurationDays : null}
        activeJobsCount={activeJobsCount}
        activeJobsLimit={activeJobsLimit}
        planLabel={resolvedPlan?.label ?? null}
        initialStatus={lifecycleStatus}
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
          listingDurationDays: job.listingDurationDays,
          companyId: job.companyId
        }}
      />
    </section>
  )
}
