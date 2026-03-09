import Link from "next/link"

import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { LinkCardGrid } from "@/components/link-card-grid"
import { listLatestPublicJobs, listTopEmployers } from "@/lib/jobs"
import { allJobsLandingLinks, allResourceArticleLinks } from "@/lib/seo-taxonomy"
import { buildPageMetadata } from "@/lib/seo"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import { buildCollectionPageJsonLd } from "@/lib/structured-data"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Salem Oregon Jobs",
  description:
    "Find jobs in Salem Oregon in one place. Browse local Salem jobs, category pages, top employers, and fresh openings from businesses hiring now.",
  path: "/",
  keywords: ["Salem Oregon jobs", "jobs in Salem Oregon", "hiring Salem Oregon", "Salem job board", "Salem Oregon employment"]
})

export default async function HomePage() {
  const [latestJobs, topEmployers] = await Promise.all([listLatestPublicJobs(6), listTopEmployers(6)])

  return (
    <section className="space-y-10">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "HireSalem home",
          description: "Salem Oregon jobs, local category pages, and Salem-specific hiring guides.",
          path: "/",
          items: allJobsLandingLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Salem Oregon jobs, not national clutter</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Find local jobs in Salem, Oregon and the surrounding market</h1>
            <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-700">
              <p>
                HireSalem exists to make Salem Oregon jobs easier to find. Instead of dropping Salem job seekers into a giant national feed, the site
                is organized around the way people actually search here: jobs in Salem Oregon, category-specific pages like restaurant jobs or
                construction jobs in Salem, nearby Keizer opportunities, and local employer pages that stay tied to live openings.
              </p>
              <p>
                That local structure matters because Salem hiring behaves differently than a national market. Government work matters more here than
                in many cities, healthcare remains one of the strongest recurring categories, and practical commute patterns mean many people should
                search both Salem and Keizer rather than relying on a single city phrase.
              </p>
              <p>
                Use HireSalem as the Salem job board anchor, then narrow into warehouse jobs, retail jobs, healthcare jobs, remote jobs, full-time
                jobs, or entry-level jobs in Salem Oregon depending on what you want next.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/jobs" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
                Browse all jobs
              </Link>
              <Link href="/jobs/salem" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                Explore Salem jobs
              </Link>
              <Link href="/resources" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                Read Salem guides
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-6 text-slate-50">
            <h2 className="text-xl font-semibold">Why HireSalem exists</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>Salem Oregon jobs deserve a local-first site that matches how people actually search.</li>
              <li>City-plus-category pages like restaurant, warehouse, construction, retail, and healthcare can outperform generic job results locally.</li>
              <li>Local employer pages and fresh listings make it easier to compare real hiring options quickly.</li>
            </ul>
          </div>
        </div>
      </section>

      <LinkCardGrid title="Browse Salem city and category pages" items={allJobsLandingLinks} columns="md:grid-cols-2 xl:grid-cols-3" />

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Top employers in Salem</h2>
            <p className="mt-1 text-sm text-slate-600">Browse employers with active local openings right now.</p>
          </div>
          <Link href="/jobs" className="text-sm font-medium text-slate-700 underline underline-offset-4">
            Browse all employers through current jobs
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topEmployers.map((company) => (
            <Link
              key={company.id}
              href={buildCompanyJobsPath(company.slug)}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">{company.name}</h3>
                <p className="text-sm text-slate-600">
                  {company.activeJobCount} active {company.activeJobCount === 1 ? "job" : "jobs"}
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  See live Salem-area openings from this employer and compare them with related local opportunities.
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Latest job listings</h2>
            <p className="mt-1 text-sm text-slate-600">Fresh openings from employers hiring in Salem and nearby communities.</p>
          </div>
          <Link href="/jobs" className="text-sm font-medium text-slate-700 underline underline-offset-4">
            Open the full jobs index
          </Link>
        </div>
        <JobList jobs={latestJobs} />
      </section>

      <LinkCardGrid title="Local job seeker guides" items={allResourceArticleLinks} columns="md:grid-cols-2" />
    </section>
  )
}
