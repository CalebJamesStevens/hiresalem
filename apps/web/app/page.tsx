import Link from "next/link"

import { InlineEmployerPromoCard } from "@/components/inline-employer-promo-card"
import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { LinkCardGrid } from "@/components/link-card-grid"
import { listLatestPublicJobs, listTopEmployers } from "@/lib/jobs"
import { getSessionSafe } from "@/lib/session"
import { allResourceArticleLinks, primaryLandingLinks } from "@/lib/seo-taxonomy"
import { buildPageMetadata } from "@/lib/seo"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import { buildCollectionPageJsonLd } from "@/lib/structured-data"

export const dynamic = "force-dynamic"

export const metadata = buildPageMetadata({
  title: "Salem, Oregon Jobs from Local Employers",
  description:
    "Find jobs in Salem, Oregon with local employers, fresh listings, and quick paths into Salem, Keizer, and category-specific openings.",
  path: "/",
  keywords: ["Salem Oregon jobs", "jobs in Salem Oregon", "hiring Salem Oregon", "Salem job board", "Salem Oregon employment"]
})

export default async function HomePage() {
  const [latestJobs, topEmployers, session] = await Promise.all([listLatestPublicJobs(6), listTopEmployers(6), getSessionSafe()])
  const userId = session?.user?.id

  return (
    <>
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "HireSalem home",
          description: "Salem Oregon jobs, local category pages, employer pages, and Salem-specific hiring guides.",
          path: "/",
          items: primaryLandingLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />

      <div className="space-y-8 md:space-y-10">
        <section>
          <div className="space-y-4">
            <form action="/jobs" method="get" className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(220px,1fr)_auto]">
                <label className="space-y-1">
                  <span className="sr-only">Search jobs</span>
                  <input
                    name="q"
                    placeholder="Search by title, company, or skill"
                    className="min-h-12 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  />
                </label>
                <label className="space-y-1">
                  <span className="sr-only">Location</span>
                  <input
                    name="location"
                    placeholder="Salem, Keizer, or remote"
                    className="min-h-12 w-full rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500"
                  />
                </label>
                <button type="submit" className="min-h-12 w-full rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white md:w-auto">
                  Search jobs
                </button>
              </div>
            </form>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)] lg:items-start">
              <div className="space-y-3">
                <div>
                  <p className="hidden text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 lg:block">Search Salem-area jobs</p>
                  <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Find Salem, Oregon jobs from local employers</h1>
                </div>
                <div className="hidden flex-wrap gap-2 text-sm lg:flex">
                  <Link href="/jobs/salem" className="rounded-full bg-slate-900 px-4 py-2 font-medium text-white">
                    Browse Salem jobs
                  </Link>
                  <Link href="/jobs" className="rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700">
                    Open all listings
                  </Link>
                </div>
                {!userId ? (
                  <div className="hidden rounded-[1.5rem] bg-slate-950 p-4 text-slate-50 lg:block">
                    <h2 className="text-lg font-semibold">Want updates when new jobs go live?</h2>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-300">Create an account to stay on top of fresh Salem-area openings.</p>
                      <Link href="/signup" className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950">
                        Create an account
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden lg:block" />
            </div>
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
          <JobList jobs={latestJobs} inlinePromo={<InlineEmployerPromoCard />} />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Local jobs in Salem, Oregon</p>
              <h2 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Why local Salem job seekers start here</h2>
              <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-700">
                <p>
                  HireSalem is built for people who want jobs in Salem, Oregon without sorting through a generic national jobs directory. Start with the
                  main Salem jobs page, compare top employers, and jump into focused local categories when you want a narrower search.
                </p>
                <p>
                  Salem hiring has its own shape. Government, healthcare, hospitality, retail, logistics, and nearby Keizer opportunities all matter
                  locally, so the strongest search starts with local hubs instead of broad national filters.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/jobs/salem" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
                  Explore Salem jobs
                </Link>
                <Link href="/jobs" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                  Browse all listings
                </Link>
                <Link href="/resources" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                  Read Salem guides
                </Link>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {primaryLandingLinks.slice(0, 4).map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-medium text-slate-700">
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 p-6 text-slate-50">
              <h2 className="text-xl font-semibold">Start with the strongest local paths</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
                <li>The Salem jobs hub gives you the broad local market view first.</li>
                <li>Category pages help you narrow into healthcare, restaurant, warehouse, construction, and retail searches quickly.</li>
                <li>Employer pages and fresh listings make it easier to compare live local hiring in one place.</li>
              </ul>
            </div>
          </div>
        </section>

        <LinkCardGrid title="Start with Salem-area job hubs" items={primaryLandingLinks} columns="md:grid-cols-2 xl:grid-cols-3" />

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

        <LinkCardGrid title="Local job seeker guides" items={allResourceArticleLinks} columns="md:grid-cols-2" />
      </div>
    </>
  )
}
