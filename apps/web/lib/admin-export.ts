import { asc, desc } from "drizzle-orm"

import { db } from "@/lib/db"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export const ADMIN_EXPORT_JOB_LIMIT = 5

export async function buildAdminDataExport(jobLimit = ADMIN_EXPORT_JOB_LIMIT) {
  const [companyRows, latestJobs] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name), asc(companies.slug)),
    db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(jobLimit)
  ])

  return {
    exportedAt: new Date().toISOString(),
    companies: companyRows,
    latestJobs
  }
}
