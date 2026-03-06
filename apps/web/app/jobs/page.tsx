import Link from "next/link"

import { JobList } from "@/components/job-list"
import { JobsSearchForm } from "@/components/jobs-search-form"
import { SaveSearchPanel } from "@/components/save-search-panel"
import { SavedSearchSummary } from "@/components/saved-search-summary"
import { buildJobsSearchPath, getJobsSearchChips, hasActiveJobsSearchFilters, parseJobsSearchParams } from "@/lib/job-search"
import { searchPublicJobs } from "@/lib/jobs"
import { listSavedSearchesForUser } from "@/lib/saved-searches"
import { getSessionSafe } from "@/lib/session"

export const dynamic = "force-dynamic"

type JobsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getPaginationPages(page: number, totalPages: number) {
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const rawSearchParams = await searchParams
  const parsedSearchParams = parseJobsSearchParams(rawSearchParams)
  const session = await getSessionSafe()
  const [searchResult, savedSearches] = await Promise.all([
    searchPublicJobs(parsedSearchParams),
    session?.user?.id ? listSavedSearchesForUser(session.user.id, 4) : Promise.resolve([])
  ])

  const chips = getJobsSearchChips(searchResult.appliedFilters)
  const hasFilters = hasActiveJobsSearchFilters(searchResult.appliedFilters)
  const totalPages = Math.max(1, Math.ceil(searchResult.total / searchResult.pageSize))
  const canonicalCurrentPath = buildJobsSearchPath({ ...searchResult.appliedFilters, page: 1 })
  const showSavedNotice = getFirstValue(rawSearchParams.saved) === "1"
  const isBoardEmpty = searchResult.total === 0 && !hasFilters
  const isNoMatch = searchResult.total === 0 && hasFilters
  const paginationPages = getPaginationPages(searchResult.page, totalPages)

  const resultSummary =
    searchResult.total === 1 ? "1 job found" : `${searchResult.total.toLocaleString()} jobs found`

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="text-sm text-slate-500">Salem-first search</p>
      </div>

      <JobsSearchForm params={searchResult.appliedFilters} />

      {showSavedNotice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Search saved. You can reopen it anytime from your dashboard.
        </p>
      ) : null}

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

        {searchResult.results.length > 0 ? <JobList jobs={searchResult.results} /> : null}

        <SaveSearchPanel currentPath={canonicalCurrentPath} />

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

        <SavedSearchSummary savedSearches={savedSearches} />
      </div>
    </section>
  )
}
