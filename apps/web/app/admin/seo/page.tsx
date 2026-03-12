import Link from "next/link"

import { requirePageRoles } from "@/lib/page-auth"
import { getSeoDashboardData } from "@/lib/seo-dashboard"

export const dynamic = "force-dynamic"

export default async function AdminSeoPage() {
  await requirePageRoles(["admin"], "/admin/seo")
  const dashboard = await getSeoDashboardData()

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">SEO dashboard</h1>
        <p className="text-slate-600">Track indexable page volume, sitemap coverage, and the most obvious public-content hygiene issues.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active job pages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.counts.activeJobPages}</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Eligible JobPosting pages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.counts.eligibleJobPostingCount}</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Company pages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.counts.companyPages}</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Taxonomy pages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.counts.taxonomyPages}</p>
        </article>
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Resource pages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dashboard.counts.resourcePages}</p>
        </article>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Sitemap totals</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Jobs sitemap</dt>
              <dd>{dashboard.counts.sitemapJobs}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Taxonomy sitemap</dt>
              <dd>{dashboard.counts.sitemapTaxonomy}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Pages sitemap</dt>
              <dd>{dashboard.counts.sitemapPages}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t pt-3 font-medium text-slate-950">
              <dt>Total sitemap URLs</dt>
              <dd>{dashboard.counts.sitemapTotal}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Quick links</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link href="/sitemap.xml" className="rounded-xl border px-4 py-2 font-medium text-slate-700">
              Open sitemap index
            </Link>
            <Link href="/jobs/salem" className="rounded-xl border px-4 py-2 font-medium text-slate-700">
              Salem landing page
            </Link>
            <Link href="/resources" className="rounded-xl border px-4 py-2 font-medium text-slate-700">
              Resource hub
            </Link>
          </div>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Google indexing</h2>
          <p className="mt-2 text-sm text-slate-600">
            {dashboard.indexing.configured ? "Google Indexing API is configured." : "Google Indexing API is not configured."}
          </p>
          {dashboard.indexing.error ? <p className="mt-2 text-sm text-amber-700">{dashboard.indexing.error}</p> : null}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Thin active jobs</h2>
          <p className="mt-1 text-sm text-slate-600">Active jobs with little or no descriptive copy left for search engines to work with.</p>
          {dashboard.hygiene.thinJobs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No thin active jobs found.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {dashboard.hygiene.thinJobs.map((job) => (
                <article key={job.id} className="rounded-xl border border-slate-200 p-4">
                  <Link href={`/jobs/${job.slug}`} className="font-medium text-slate-900 underline underline-offset-4">
                    {job.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">{job.descriptionLength} characters of description text</p>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Active jobs missing company profiles</h2>
          <p className="mt-1 text-sm text-slate-600">These roles cannot generate company landing pages until they are tied to a valid company record.</p>
          {dashboard.hygiene.jobsMissingCompanyProfiles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">All active jobs currently resolve to a company profile.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {dashboard.hygiene.jobsMissingCompanyProfiles.map((job) => (
                <article key={job.id} className="rounded-xl border border-slate-200 p-4">
                  <Link href={`/jobs/${job.slug}`} className="font-medium text-slate-900 underline underline-offset-4">
                    {job.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">Company id: {job.companyId ?? "none"}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">JobPosting blockers</h2>
          <dl className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-4">
              <dt>Missing company</dt>
              <dd>{dashboard.counts.activeJobsBlockedByMissingCompany}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Missing structured location</dt>
              <dd>{dashboard.counts.activeJobsBlockedByMissingLocation}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt>Other schema blockers</dt>
              <dd>{dashboard.counts.activeJobsBlockedByOtherReasons}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Schema-suppressed job pages</h2>
          <p className="mt-1 text-sm text-slate-600">These pages stay live, but `JobPosting` markup is currently suppressed.</p>
          {dashboard.hygiene.schemaSuppressedJobs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No active jobs are currently blocked from JobPosting markup.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {dashboard.hygiene.schemaSuppressedJobs.map((job) => (
                <article key={job.slug} className="rounded-xl border border-slate-200 p-4">
                  <Link href={`/jobs/${job.slug}`} className="font-medium text-slate-900 underline underline-offset-4">
                    {job.title}
                  </Link>
                  <p className="mt-1 text-sm text-slate-600">{job.reasons.join(", ")}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </section>
  )
}
