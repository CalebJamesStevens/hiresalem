import { asc, desc, gte } from "drizzle-orm"

import { db } from "@/lib/db"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export const ADMIN_EXPORT_JOB_LIMIT = 5
const DAY_IN_MS = 24 * 60 * 60 * 1000

export type AdminDataExportOptions = {
  jobLimit?: number | null
  jobMaxAgeDays?: number | null
}

function getCreatedSince(jobMaxAgeDays: number | null | undefined) {
  if (typeof jobMaxAgeDays !== "number") {
    return null
  }

  return new Date(Date.now() - jobMaxAgeDays * DAY_IN_MS)
}

export async function buildAdminDataExport(options: AdminDataExportOptions = {}) {
  const jobLimit = options.jobLimit ?? ADMIN_EXPORT_JOB_LIMIT
  const jobMaxAgeDays = options.jobMaxAgeDays ?? null
  const createdSince = getCreatedSince(jobMaxAgeDays)

  const jobsQuery =
    createdSince && typeof jobLimit === "number"
      ? db.select().from(jobs).where(gte(jobs.createdAt, createdSince)).orderBy(desc(jobs.createdAt)).limit(jobLimit)
      : createdSince
        ? db.select().from(jobs).where(gte(jobs.createdAt, createdSince)).orderBy(desc(jobs.createdAt))
        : typeof jobLimit === "number"
          ? db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(jobLimit)
          : db.select().from(jobs).orderBy(desc(jobs.createdAt))

  const [companyRows, latestJobs] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name), asc(companies.slug)),
    jobsQuery
  ])

  return {
    exportedAt: new Date().toISOString(),
    companies: companyRows,
    latestJobs,
    jobSelection: {
      limit: jobLimit,
      maxAgeDays: jobMaxAgeDays,
      createdSince: createdSince?.toISOString() ?? null
    }
  }
}
