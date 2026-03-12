import Link from "next/link"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { FeaturedJobBadge } from "@/components/featured-job-badge"
import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { MarkdownContent } from "@/components/markdown-content"
import { ApplicationForm } from "@/components/application-form"
import { TrackedApplyLink } from "@/components/tracked-apply-link"
import { hasAnyRole, hasRole, normalizeRoles } from "@/lib/authz"
import { buildEligibleJobPostingJsonLd } from "@/lib/job-posting"
import {
  canServeUnavailableJobPage,
  getJobStatusLabel,
  getUnavailableJobRetentionEndsAt,
  isJobPublished
} from "@/lib/job-listing-billing"
import { categoryOptions, employmentTypeOptions } from "@/lib/job-search"
import { getJobBySlug, listRelatedJobsForJob, type PublicJobDetail } from "@/lib/jobs"
import { markdownToPlainText } from "@/lib/markdown"
import { buildPageMetadata, snippet } from "@/lib/seo"
import { getJobHubLinksForContext } from "@/lib/seo-taxonomy"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import { getSessionSafe } from "@/lib/session"
import { buildBreadcrumbJsonLd, inferJobLocationFromLegacyText } from "@/lib/structured-data"

type JobPageProps = {
  params: Promise<{
    slug: string
  }>
}

function formatCompensation(job: PublicJobDetail) {
  if (job.salary) {
    return job.salary
  }

  if (job.salaryMin == null && job.salaryMax == null) {
    return null
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.salaryCurrency ?? "USD",
    maximumFractionDigits: 2
  })
  const lower = job.salaryMin != null ? formatter.format(job.salaryMin) : null
  const upper = job.salaryMax != null ? formatter.format(job.salaryMax) : null
  const interval = job.salaryInterval ? ` / ${job.salaryInterval}` : ""

  if (lower && upper) {
    return `${lower} - ${upper}${interval}`
  }

  return `${lower ?? upper}${interval}`
}

function formatCalendarDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(value)
}

export async function generateMetadata({ params }: JobPageProps) {
  const { slug } = await params
  const job = await getJobBySlug(slug)

  if (!job) {
    return buildPageMetadata({
      title: "Job not found",
      description: "The requested Salem-area job listing could not be found.",
      path: `/jobs/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const canServeUnavailable = canServeUnavailableJobPage(job)
  const title = `${job.title} job in ${job.location ?? "Salem Oregon"}`
  const unavailableTitle = `${job.title} job in ${job.location ?? "Salem Oregon"} no longer available`
  const description = isJobPublished(job)
    ? snippet(job.description, `${job.title} at ${job.companyName ?? "a Salem-area employer"} in ${job.location ?? "Salem Oregon"}.`, 155)
    : snippet(
        `${job.title} at ${job.companyName ?? "a Salem-area employer"} is no longer available. Browse current Salem-area jobs, employer pages, and related local openings on HireSalem.`,
        unavailableTitle,
        155
      )

  return buildPageMetadata({
    title: isJobPublished(job) ? title : unavailableTitle,
    description,
    path: `/jobs/${job.slug}`,
    robots: isJobPublished(job)
      ? undefined
      : canServeUnavailable
        ? {
            index: false,
            follow: true
          }
        : {
            index: false,
            follow: false
          },
    keywords: [job.title, `${job.location ?? "Salem Oregon"} job`, job.companyName ?? "Salem employer", "Salem Oregon jobs"]
  })
}

export default async function JobPage({ params }: JobPageProps) {
  const { slug } = await params
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const job = await getJobBySlug(slug)

  if (!job) {
    notFound()
  }

  const isPublished = isJobPublished(job)
  const canServeUnavailable = canServeUnavailableJobPage(job)
  const statusLabel = getJobStatusLabel(job)
  const canViewInactive = Boolean(userId && (isAdmin || job.ownerAuthId === userId))
  const isPublicUnavailable = !isPublished && !canViewInactive

  if (isPublicUnavailable && !canServeUnavailable) {
    notFound()
  }

  const [relatedJobs] = await Promise.all([listRelatedJobsForJob(job, 4)])
  const canApplyInApp = job.applyType === "onsite" && isPublished && hasAnyRole(roles, ["user", "admin"])
  const signedInName = typeof session?.user?.name === "string" ? session.user.name : null
  const signedInEmail = typeof session?.user?.email === "string" ? session.user.email : null
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(`/jobs/${job.slug}`)}`
  const companyPath = job.companySlug ? buildCompanyJobsPath(job.companySlug) : null
  const legacyJobLocation = inferJobLocationFromLegacyText(job.location)
  const jobLocation =
    job.workMode === "remote"
      ? null
      : {
          city: job.jobLocationCity ?? legacyJobLocation?.city ?? "",
          region: job.jobLocationRegion ?? legacyJobLocation?.region ?? "",
          country: job.jobLocationCountry ?? legacyJobLocation?.country ?? "",
          streetAddress: job.streetAddress,
          postalCode: job.postalCode
        }
  const workModeLabel =
    job.workMode === "remote" ? "Remote" : job.workMode === "hybrid" ? "Hybrid" : job.workMode === "onsite" ? "On-site" : null
  const employmentTypeLabel = job.employmentType
    ? employmentTypeOptions.find((option) => option.value === job.employmentType)?.label ?? job.employmentType
    : null
  const categoryLabel = job.category ? categoryOptions.find((option) => option.value === job.category)?.label ?? job.category : null
  const compensation = formatCompensation(job)
  const postedAt = job.activatedAt ?? job.createdAt
  const removalDate = getUnavailableJobRetentionEndsAt(job)
  const hubLinks = getJobHubLinksForContext({
    categories: [job.category],
    locations: [job.location],
    includeJobsIndex: true
  })
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Salem jobs", href: "/jobs/salem" },
    ...(companyPath && job.companyName ? [{ name: job.companyName, href: companyPath }] : []),
    { name: job.title, href: `/jobs/${job.slug}` }
  ]
  const localContext = isPublicUnavailable
    ? `${job.companyName ?? "This Salem-area employer"} is no longer accepting applications for this role. Use the links below to move into current Salem-area jobs, related employer pages, and nearby alternatives.`
    : `${job.companyName ?? "This Salem-area employer"} is hiring${job.location ? ` in ${job.location}` : " in Salem Oregon"}. Use this page for the role details, then compare it with broader Salem jobs pages if you want nearby alternatives.`
  const mobileApplyButtonClassName =
    "inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
  const mobileApplyCta =
    isPublicUnavailable
      ? null
      : job.applyType === "external" && isPublished && job.applyUrl
        ? {
            kind: "external" as const,
            href: job.applyUrl,
            label: "Apply on company site"
          }
        : canApplyInApp
        ? {
            kind: "anchor" as const,
            href: "#application-form",
            label: "Apply now"
          }
        : job.applyType === "onsite" && isPublished && !userId
          ? {
              kind: "internal" as const,
              href: signInHref,
              label: "Sign in to apply"
            }
          : null
  const jobSnapshot = [
    { label: "Location", value: job.location ?? "Salem, OR" },
    { label: "Employer", value: job.companyName ?? "Local employer" },
    employmentTypeLabel ? { label: "Schedule", value: employmentTypeLabel } : null,
    workModeLabel ? { label: "Work mode", value: workModeLabel } : null,
    categoryLabel ? { label: "Category", value: categoryLabel } : null,
    compensation ? { label: "Pay", value: compensation } : null,
    { label: "Posted", value: formatCalendarDate(postedAt) }
  ].filter((item): item is { label: string; value: string } => item !== null)
  const featuredHeaderPillClassName = job.isFeatured
    ? "rounded-full border border-slate-200 bg-white px-3 py-1"
    : "rounded-full bg-slate-100 px-3 py-1"
  const jobPosting = buildEligibleJobPostingJsonLd({
    title: job.title,
    description: markdownToPlainText(job.description) || null,
    path: `/jobs/${job.slug}`,
    datePosted: job.activatedAt ?? job.createdAt,
    validThrough: job.expiresAt,
    employmentType: job.employmentType,
    hiringOrganizationName: job.companyName,
    hiringOrganizationWebsite: job.companyWebsite,
    jobLocation,
    applicantLocationCountry: "US",
    isRemote: job.workMode === "remote",
    baseSalary:
      job.salaryMin || job.salaryMax
        ? {
            currency: job.salaryCurrency ?? "USD",
            minValue: job.salaryMin,
            maxValue: job.salaryMax,
            unitText: job.salaryInterval ?? null
          }
        : null
  })

  return (
    <article className={mobileApplyCta ? "min-w-0 space-y-8 pb-32 lg:pb-0" : "min-w-0 space-y-8"}>
      <JsonLd
        data={buildBreadcrumbJsonLd(
          breadcrumbs.map((item) => ({
            name: item.name,
            path: item.href
          }))
        )}
      />
      {isPublished ? (
        jobPosting.jsonLd ? <JsonLd data={jobPosting.jsonLd} /> : null
      ) : null}

      <section
        className={`min-w-0 overflow-hidden rounded-[2rem] border p-6 shadow-sm ${
          job.isFeatured ? "border-indigo-200 bg-indigo-50/30 shadow-[0_12px_32px_-28px_rgba(37,99,235,0.45)]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="min-w-0 space-y-4">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {job.isFeatured ? <FeaturedJobBadge /> : null}
            <span className={featuredHeaderPillClassName}>{job.applyType === "onsite" ? "Apply in app" : "External apply"}</span>
            <span className={featuredHeaderPillClassName}>{statusLabel}</span>
            {workModeLabel ? <span className={featuredHeaderPillClassName}>{workModeLabel}</span> : null}
          </div>
          <div className="min-w-0 space-y-2">
            <h1 className="break-words text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{job.title}</h1>
            <p className="text-base text-slate-600">{job.location ?? "Salem, OR"}</p>
            {job.companyName ? (
              <p className="break-words text-sm text-slate-700">
                Hiring company:{" "}
                {companyPath ? (
                  <Link href={companyPath} className="break-words font-medium underline underline-offset-4">
                    {job.companyName}
                  </Link>
                ) : (
                  <span className="font-medium">{job.companyName}</span>
                )}
              </p>
            ) : null}
          </div>
          {!isPublished ? (
            <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This role is currently {statusLabel.toLowerCase()}.
            </p>
          ) : null}
          {isPublicUnavailable ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-900">This job is no longer accepting applications.</p>
              <p className="mt-1">
                HireSalem keeps unavailable job pages live for a short period so job seekers can move into current openings, employer pages, and
                related Salem hiring paths.
              </p>
              <p className="mt-1 text-slate-600">This page is set to be removed after {formatCalendarDate(removalDate)}.</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">About the role</h2>
              {isPublicUnavailable ? <p className="text-sm text-slate-500">The details below reflect the original listing for this role.</p> : null}
              <MarkdownContent value={job.description} fallback="No description provided yet." />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Salem Oregon context</h2>
              <p className="text-sm leading-7 text-slate-700">{localContext}</p>
              {hubLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hubLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      {link.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {relatedJobs.length > 0 ? (
            <section className="min-w-0 space-y-4 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Related jobs</h2>
                <p className="mt-1 text-sm text-slate-600">More local openings related by company, location, or role profile.</p>
              </div>
              <JobList jobs={relatedJobs} />
            </section>
          ) : null}

          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="min-w-0 space-y-2">
              <h2 className="text-xl font-semibold">What to expect</h2>
              <p className="text-sm text-slate-300">
                Strong applications usually include a resume or profile link plus a short note that ties your experience to the role.
              </p>
            </div>
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Job snapshot</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-700">
              {jobSnapshot.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">{item.label}</dt>
                  <dd className="text-right font-medium text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {job.applyType === "external" ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Apply through the employer</h2>
              <p className="mt-2 text-sm text-slate-600">
                This job uses an external application flow. We&apos;ll send you directly to the company site.
              </p>
              <div className="mt-5">
                {isPublished && job.applyUrl ? (
                  <TrackedApplyLink
                    href={job.applyUrl}
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Apply on company site
                  </TrackedApplyLink>
                ) : !isPublished ? (
                  <p className="text-sm text-slate-600">This listing is not currently accepting applications.</p>
                ) : (
                  <p className="text-sm text-slate-600">External apply link not available.</p>
                )}
              </div>
            </div>
          ) : null}

          {job.applyType === "onsite" && !isPublished ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              This position is not currently accepting applications.
            </div>
          ) : null}

          {job.applyType === "onsite" && isPublished && !userId ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <Link className="font-medium underline" href={signInHref}>
                Sign in
              </Link>{" "}
              with a user account to apply and keep track of your applications.
            </div>
          ) : null}

          {job.applyType === "onsite" && isPublished && userId && !canApplyInApp ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Your account role cannot submit applications.
            </div>
          ) : null}

          {canApplyInApp ? (
            <div id="application-form" className="scroll-mt-24">
              <ApplicationForm
                jobId={job.id}
                jobTitle={job.title}
                jobLocation={job.location}
                defaultName={signedInName}
                defaultEmail={signedInEmail}
              />
            </div>
          ) : null}

          {hubLinks.length > 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Explore related Salem pages</h2>
              <div className="mt-4 space-y-3">
                {hubLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-2xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
                    <p className="font-medium text-slate-900">{link.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{link.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {mobileApplyCta ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/85 lg:hidden">
          <div className="mx-auto w-full max-w-md pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {mobileApplyCta.kind === "external" ? (
              <TrackedApplyLink href={mobileApplyCta.href} className={mobileApplyButtonClassName}>
                {mobileApplyCta.label}
              </TrackedApplyLink>
            ) : mobileApplyCta.kind === "internal" ? (
              <Link href={mobileApplyCta.href} className={mobileApplyButtonClassName}>
                {mobileApplyCta.label}
              </Link>
            ) : (
              <a href={mobileApplyCta.href} className={mobileApplyButtonClassName}>
                {mobileApplyCta.label}
              </a>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}
