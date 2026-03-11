import Link from "next/link"

import { categoryOptions, employmentTypeOptions, workModeOptions } from "@/lib/job-search"
import type { PublicJobSearchResult } from "@/lib/jobs"
import { markdownToPlainText } from "@/lib/markdown"
import { buildCompanyJobsPath } from "@/lib/site-paths"

function formatRelativeDate(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))

  if (diffDays === 0) {
    return "Posted today"
  }

  if (diffDays === 1) {
    return "Posted 1 day ago"
  }

  return `Posted ${diffDays} days ago`
}

function formatSalary(job: PublicJobSearchResult) {
  if (job.salary) {
    return job.salary
  }

  if (job.salaryMin == null && job.salaryMax == null) {
    return null
  }

  const currency = job.salaryCurrency ?? "USD"
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
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

export function JobCard({ job }: { job: PublicJobSearchResult }) {
  const description = markdownToPlainText(job.description) || "No description yet."
  const postedAt = job.activatedAt ?? job.createdAt
  const meta = [
    job.workMode ? workModeOptions.find((option) => option.value === job.workMode)?.label : null,
    job.employmentType ? employmentTypeOptions.find((option) => option.value === job.employmentType)?.label : null,
    job.category ? categoryOptions.find((option) => option.value === job.category)?.label : null,
    formatSalary(job)
  ].filter(Boolean)

  return (
    <article className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">
              <Link href={`/jobs/${job.slug}`} className="underline underline-offset-4">
                {job.title}
              </Link>
            </h2>
            {job.companySlug && job.companyName ? (
              <Link href={buildCompanyJobsPath(job.companySlug)} className="text-sm font-medium text-slate-700 underline">
                {job.companyName}
              </Link>
            ) : job.companyName ? (
              <p className="text-sm font-medium text-slate-700">{job.companyName}</p>
            ) : null}
            <p className="text-sm text-slate-600">{job.location ?? "Salem, OR"}</p>
          </div>

          {meta.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {meta.map((item) => (
                <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <p className="text-sm text-slate-700 line-clamp-3">{description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{formatRelativeDate(postedAt)}</p>
          <Link href={`/jobs/${job.slug}`} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            View details
          </Link>
        </div>
      </div>
    </article>
  )
}
