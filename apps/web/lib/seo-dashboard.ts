import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { getPublishedJobsFilter } from "@/lib/job-listing-billing"
import { listCompaniesWithActiveJobsForSitemap } from "@/lib/jobs"
import { resourceArticles, jobsLandingPages } from "@/lib/seo-taxonomy"
import { getSitemapCounts } from "@/lib/sitemaps"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export async function getSeoDashboardData() {
  const [activeJobCountRows, companyPages, sitemapCounts, thinJobs, jobsMissingCompanyProfiles] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`
      })
      .from(jobs)
      .where(getPublishedJobsFilter()),
    listCompaniesWithActiveJobsForSitemap(),
    getSitemapCounts(),
    db
      .select({
        id: jobs.id,
        slug: jobs.slug,
        title: jobs.title,
        descriptionLength: sql<number>`char_length(trim(coalesce(${jobs.description}, '')))`
      })
      .from(jobs)
      .where(and(getPublishedJobsFilter(), sql`char_length(trim(coalesce(${jobs.description}, ''))) < 140`))
      .orderBy(desc(jobs.createdAt))
      .limit(10),
    db
      .select({
        id: jobs.id,
        slug: jobs.slug,
        title: jobs.title,
        companyId: jobs.companyId
      })
      .from(jobs)
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(getPublishedJobsFilter(), isNull(companies.id)))
      .orderBy(desc(jobs.createdAt))
      .limit(10)
  ])

  return {
    counts: {
      activeJobPages: activeJobCountRows[0]?.total ?? 0,
      companyPages: companyPages.length,
      taxonomyPages: jobsLandingPages.length,
      resourcePages: resourceArticles.length + 1,
      sitemapPages: sitemapCounts.pages,
      sitemapTaxonomy: sitemapCounts.taxonomy,
      sitemapJobs: sitemapCounts.jobs,
      sitemapTotal: sitemapCounts.total
    },
    hygiene: {
      thinJobs,
      jobsMissingCompanyProfiles
    }
  }
}
