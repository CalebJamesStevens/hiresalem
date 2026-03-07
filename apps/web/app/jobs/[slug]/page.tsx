import Link from "next/link"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { MarkdownContent } from "@/components/markdown-content"
import { ApplicationForm } from "@/components/application-form"
import { TrackedApplyLink } from "@/components/tracked-apply-link"
import { hasAnyRole, hasRole, normalizeRoles } from "@/lib/authz"
import { getJobStatusLabel, isJobPublished } from "@/lib/job-listing-billing"
import { getJobBySlug, listRelatedJobsForJob } from "@/lib/jobs"
import { markdownToPlainText } from "@/lib/markdown"
import { buildPageMetadata, snippet } from "@/lib/seo"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import { getSessionSafe } from "@/lib/session"
import { buildBreadcrumbJsonLd, buildJobPostingJsonLd } from "@/lib/structured-data"

type JobPageProps = {
  params: Promise<{
    slug: string
  }>
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

  const title = `${job.title} job in ${job.location ?? "Salem Oregon"}`
  const description = snippet(
    job.description,
    `${job.title} at ${job.companyName ?? "a Salem-area employer"} in ${job.location ?? "Salem Oregon"}.`,
    155
  )

  return buildPageMetadata({
    title,
    description,
    path: `/jobs/${job.slug}`,
    robots: isJobPublished(job)
      ? undefined
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
  const statusLabel = getJobStatusLabel(job)
  const canViewInactive = Boolean(userId && (isAdmin || job.ownerAuthId === userId))
  if (!isPublished && !canViewInactive) {
    notFound()
  }

  const [relatedJobs] = await Promise.all([listRelatedJobsForJob(job, 4)])
  const canApplyInApp = job.applyType === "onsite" && isPublished && hasAnyRole(roles, ["user", "admin"])
  const signedInName = typeof session?.user?.name === "string" ? session.user.name : null
  const signedInEmail = typeof session?.user?.email === "string" ? session.user.email : null
  const signInHref = `/signin?callbackUrl=${encodeURIComponent(`/jobs/${job.slug}`)}`
  const companyPath = job.companySlug ? buildCompanyJobsPath(job.companySlug) : null
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: job.title, href: `/jobs/${job.slug}` }
  ]
  const localContext = `${job.companyName ?? "This Salem-area employer"} is hiring${job.location ? ` in ${job.location}` : " in Salem Oregon"}. Use this page for the role details, then compare it with broader Salem Oregon jobs pages if you want nearby alternatives.`
  const mobileApplyButtonClassName =
    "inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white"
  const mobileApplyCta =
    job.applyType === "external" && isPublished && job.applyUrl
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
        <JsonLd
          data={buildJobPostingJsonLd({
            title: job.title,
            description: markdownToPlainText(job.description) || `${job.title} at ${job.companyName ?? "a Salem-area employer"}`,
            path: `/jobs/${job.slug}`,
            datePosted: job.createdAt,
            employmentType: job.employmentType,
            hiringOrganizationName: job.companyName,
            hiringOrganizationPath: companyPath,
            jobLocation: job.location ?? "Salem",
            baseSalary:
              job.salaryMin || job.salaryMax
                ? {
                    currency: job.salaryCurrency ?? "USD",
                    minValue: job.salaryMin,
                    maxValue: job.salaryMax,
                    unitText: job.salaryInterval ?? null
                  }
                : null
          })}
        />
      ) : null}

      <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="min-w-0 space-y-4">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.applyType === "onsite" ? "Apply in app" : "External apply"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{statusLabel}</span>
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
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">About the role</h2>
              <MarkdownContent value={job.description} fallback="No description provided yet." />
            </div>
          </section>

          <section className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="min-w-0 space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">Salem Oregon context</h2>
              <p className="text-sm leading-7 text-slate-700">{localContext}</p>
              <p className="text-sm leading-7 text-slate-700">
                Want a wider look at the market? Compare this role with the broader{" "}
                <Link href="/jobs/salem" className="font-medium underline underline-offset-4">
                  Salem Oregon jobs
                </Link>{" "}
                page or explore{" "}
                <Link href="/jobs/keizer" className="font-medium underline underline-offset-4">
                  nearby Keizer jobs
                </Link>
                .
              </p>
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
