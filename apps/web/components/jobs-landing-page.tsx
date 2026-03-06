import Link from "next/link"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { LinkCardGrid } from "@/components/link-card-grid"
import type { JobsLandingPage } from "@/lib/seo-taxonomy"
import { buildJobsSearchPath } from "@/lib/job-search"
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqJsonLd } from "@/lib/structured-data"
import type { PublicJobSearchResponse } from "@/lib/jobs"

export function JobsLandingPageView({
  page,
  searchResult
}: {
  page: JobsLandingPage
  searchResult: PublicJobSearchResponse
}) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: page.seoTitle, href: page.path }
  ]

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(
    breadcrumbs.map((item) => ({
      name: item.name,
      path: item.href
    }))
  )
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: page.seoTitle,
    description: page.seoDescription,
    path: page.path,
    items: searchResult.results.map((job) => ({
      name: job.title,
      path: `/jobs/${job.slug}`
    }))
  })
  const faqJsonLd = buildFaqJsonLd(page.faqs)
  const browseAllHref = buildJobsSearchPath(page.searchParams)

  return (
    <section className="space-y-8">
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={collectionJsonLd} />
      <JsonLd data={faqJsonLd} />

      <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Breadcrumbs items={breadcrumbs} />
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{page.eyebrow}</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">{page.heroTitle}</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="space-y-4">
            {page.intro.map((paragraph) => (
              <p key={paragraph} className="max-w-3xl text-base leading-7 text-slate-700">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="rounded-[1.75rem] bg-slate-950 p-5 text-slate-50">
            <h2 className="text-lg font-semibold">Why this page helps</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              {page.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-5">
              <Link href={browseAllHref} className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-950">
                Open the matching jobs search
              </Link>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Current openings</h2>
            <p className="mt-1 text-sm text-slate-600">
              {searchResult.total === 1 ? "1 job matches this page right now." : `${searchResult.total.toLocaleString()} jobs match this page right now.`}
            </p>
          </div>
          <Link href={browseAllHref} className="text-sm font-medium text-slate-700 underline underline-offset-4">
            View this search in the main jobs index
          </Link>
        </div>

        {searchResult.results.length > 0 ? (
          <JobList jobs={searchResult.results} />
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-xl font-semibold text-slate-900">No fresh matches right now</h3>
            <p className="mt-2 text-sm text-slate-600">
              Keep this page in rotation, then widen the search using the related Salem-area pages below.
            </p>
          </div>
        )}
      </section>

      <FaqSection title="Questions Salem job seekers ask" items={page.faqs} />
      <LinkCardGrid title="Keep exploring local pages" items={page.relatedLinks} />
    </section>
  )
}
