import Link from "next/link"

import { InlineEmployerPromoCard } from "@/components/inline-employer-promo-card"
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
  const currentSearchPath = buildJobsSearchPath(searchResult.appliedFilters)
  const canonicalCurrentPath = buildJobsSearchPath({ ...searchResult.appliedFilters, page: 1 })
  const isBoardEmpty = searchResult.total === 0 && !hasFilters
  const isNoMatch = searchResult.total === 0 && hasFilters
  const paginationPages = getPaginationPages(searchResult.page, totalPages)
  const isIndexablePage = isCleanJobsIndexPage(searchResult.appliedFilters)

  const resultSummary = searchResult.total === 1 ? "1 job found" : `${searchResult.total.toLocaleString()} jobs found`

  return (
    <section className="space-y-6 md:space-y-8">
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

      <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">Browse all current jobs on HireSalem</h1>
      <JobsSearchForm params={searchResult.appliedFilters} />
      <div className="space-y-4">
        {!session ? (
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-700">Create an account or sign in to personalize your jobs search.</p>
            <Link
              href={`/signup?callbackUrl=${encodeURIComponent(currentSearchPath)}`}
              className="mt-3 inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-[#2C81D6] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-[#236CB3]"
            >
              Get Started
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M4.167 10h11.666M10 4.167 15.833 10 10 15.833" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ) : null}

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

        {searchResult.results.length > 0 ? <JobList jobs={searchResult.results} savedJobIds={savedJobIds} inlinePromo={<InlineEmployerPromoCard />} /> : null}

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
      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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

      <LinkCardGrid title="Browse Salem city and category pages" items={allJobsLandingLinks} columns="md:grid-cols-2 xl:grid-cols-3" />
      <LinkCardGrid title="Local job seeker guides" items={allResourceArticleLinks} columns="md:grid-cols-2" />
    </section>
  )
}
