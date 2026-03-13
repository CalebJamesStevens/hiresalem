import Link from "next/link"

import { JsonLd } from "@/components/json-ld"
import { JobList } from "@/components/job-list"
import { JobsSearchForm } from "@/components/jobs-search-form"
import { LinkCardGrid } from "@/components/link-card-grid"
import { SaveSearchPanel } from "@/components/save-search-panel"
import { allJobsLandingLinks, allResourceArticleLinks, primaryLandingLinks } from "@/lib/seo-taxonomy"
import { buildJobsSearchPath, getJobsSearchChips, hasActiveJobsSearchFilters, parseJobsSearchParams, type JobsSearchParams } from "@/lib/job-search"
import { searchPublicJobs } from "@/lib/jobs"
import { listSavedJobIdsForUser } from "@/lib/saved-jobs"
import {
  buildPageMetadata,
  getJobsPageCanonicalPath,
  getJobsPageDescription,
  getJobsPageRobots,
  getJobsPageTitle,
  isCleanJobsIndexPage
} from "@/lib/seo"
import { buildCollectionPageJsonLd } from "@/lib/structured-data"
import { getSessionSafe } from "@/lib/session"

export const revalidate = 300

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getPaginationPages(page: number, totalPages: number) {
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function getJobsPageKeywords(params: JobsSearchParams) {
  if (!isCleanJobsIndexPage(params)) {
    return undefined
  }

  return ["HireSalem jobs", "local job listings", "current job openings"]
}

export async function generateMetadata({ searchParams }: JobsPageProps) {
  const parsedSearchParams = parseJobsSearchParams(await searchParams)

  return buildPageMetadata({
    title: getJobsPageTitle(parsedSearchParams),
    description: getJobsPageDescription(parsedSearchParams),
    path: getJobsPageCanonicalPath(parsedSearchParams),
    robots: getJobsPageRobots(parsedSearchParams),
    keywords: getJobsPageKeywords(parsedSearchParams)
  })
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const parsedSearchParams = parseJobsSearchParams(await searchParams)
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const [searchResult, savedJobIds] = await Promise.all([
    searchPublicJobs(parsedSearchParams),
    userId ? listSavedJobIdsForUser(userId) : Promise.resolve([])
  ])

  const chips = getJobsSearchChips(searchResult.appliedFilters)
  const hasFilters = hasActiveJobsSearchFilters(searchResult.appliedFilters)
  const totalPages = Math.max(1, Math.ceil(searchResult.total / searchResult.pageSize))
  const canonicalCurrentPath = buildJobsSearchPath({ ...searchResult.appliedFilters, page: 1 })
  const isBoardEmpty = searchResult.total === 0 && !hasFilters
  const isNoMatch = searchResult.total === 0 && hasFilters
  const paginationPages = getPaginationPages(searchResult.page, totalPages)
  const isIndexablePage = isCleanJobsIndexPage(searchResult.appliedFilters)

  const resultSummary = searchResult.total === 1 ? "1 job found" : `${searchResult.total.toLocaleString()} jobs found`

  return (
    <section className="space-y-8">
      {isIndexablePage ? (
        <JsonLd
          data={buildCollectionPageJsonLd({
            name: "Salem Oregon jobs",
            description: "Browse Salem Oregon jobs across local employers, nearby city pages, and category pages.",
            path: "/jobs",
            items: searchResult.results.map((job) => ({
              name: job.title,
              path: `/jobs/${job.slug}`
            }))
          })}
        />
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">All current HireSalem listings</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Browse all current jobs on HireSalem</h1>
            <p className="max-w-3xl text-base leading-7 text-slate-700">
              Use this page when you want the full searchable index. Search by keyword, filter by role details, or jump into the Salem jobs hub when
              you want the strongest local landing page for broad Salem intent.
            </p>
          </div>
          <Link href="/jobs/salem" className="text-sm font-medium text-slate-700 underline underline-offset-4">
            Start with Salem jobs
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-950">Need the local overview first?</h2>
            <p className="text-sm leading-6 text-slate-600">
              Start on the Salem jobs hub for the main local landing page, then come back here when you want every current listing and filter state.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/jobs/salem" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Open Salem jobs
            </Link>
            {primaryLandingLinks.slice(2, 5).map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <JobsSearchForm params={searchResult.appliedFilters} />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-slate-700">{resultSummary}</p>
          {chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Link key={`${chip.label}-${chip.href}`} href={chip.href} className="rounded-full border px-3 py-1 text-xs font-medium text-slate-700">
                  {chip.label} x
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {isBoardEmpty ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">No jobs posted yet</h2>
            <p className="mt-2 text-slate-600">Employers have not published any openings yet. Check back soon.</p>
          </div>
        ) : null}

        {isNoMatch ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
            <h2 className="text-xl font-semibold">No jobs match this search</h2>
            <p className="mt-2 text-slate-600">Try broadening your keywords or clearing one of the active filters.</p>
            <Link href="/jobs" className="mt-4 inline-block rounded-xl border px-4 py-2 font-medium">
              Reset search
            </Link>
          </div>
        ) : null}

        {searchResult.results.length > 0 ? <JobList jobs={searchResult.results} savedJobIds={savedJobIds} /> : null}

        {searchResult.total > searchResult.pageSize ? (
          <nav className="flex flex-wrap items-center gap-2" aria-label="Pagination">
            {searchResult.page > 1 ? (
              <Link
                href={buildJobsSearchPath({ ...searchResult.appliedFilters, page: searchResult.page - 1 })}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Previous
              </Link>
            ) : null}

            {paginationPages.map((page) => (
              <Link
                key={page}
                href={buildJobsSearchPath({ ...searchResult.appliedFilters, page })}
                className={`rounded-xl border px-3 py-2 text-sm ${page === searchResult.page ? "bg-slate-900 text-white" : "bg-white"}`}
              >
                {page}
              </Link>
            ))}

            {searchResult.page < totalPages ? (
              <Link
                href={buildJobsSearchPath({ ...searchResult.appliedFilters, page: searchResult.page + 1 })}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                Next
              </Link>
            ) : null}
          </nav>
        ) : null}

        <SaveSearchPanel currentPath={canonicalCurrentPath} />
      </div>

      <LinkCardGrid title="Browse Salem city and category pages" items={allJobsLandingLinks} columns="md:grid-cols-2 xl:grid-cols-3" />
      <LinkCardGrid title="Local job seeker guides" items={allResourceArticleLinks} columns="md:grid-cols-2" />
    </section>
  )
}
