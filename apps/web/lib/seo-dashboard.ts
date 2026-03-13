import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { getGoogleIndexingConfigurationStatus } from "@/lib/google-indexing"
import { getPublishedJobsFilter } from "@/lib/job-listing-billing"
import { buildEligibleJobPostingJsonLd, type JobPostingEligibilityReason } from "@/lib/job-posting"
import { listCompaniesForSitemap } from "@/lib/jobs"
import { resourceArticles, jobsLandingPages } from "@/lib/seo-taxonomy"
import { getSitemapCounts } from "@/lib/sitemaps"
import { companies } from "@repo/db/schema/companies"
import { jobs } from "@repo/db/schema/jobs"

export function summarizeJobPostingEligibility(
  jobs: Array<{
    slug: string
    title: string
    reasons: JobPostingEligibilityReason[]
  }>
) {
  return {
    eligibleJobPostingCount: jobs.filter((job) => job.reasons.length === 0).length,
    activeJobsBlockedByMissingCompany: jobs.filter((job) => job.reasons.includes("missing_hiring_organization")).length,
    activeJobsBlockedByMissingLocation: jobs.filter((job) => job.reasons.includes("missing_job_location")).length,
    activeJobsBlockedByOtherReasons: jobs.filter(
      (job) =>
        job.reasons.length > 0 &&
        !job.reasons.includes("missing_hiring_organization") &&
        !job.reasons.includes("missing_job_location")
    ).length,
    schemaSuppressedJobs: jobs.filter((job) => job.reasons.length > 0).slice(0, 10)
  }
}

export async function getSeoDashboardData() {
  const [activeJobCountRows, companyPages, sitemapCounts, thinJobs, jobsMissingCompanyProfiles, activeJobsForSchema] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`
      })
      .from(jobs)
      .where(getPublishedJobsFilter()),
    listCompaniesForSitemap(),
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
      .limit(10),
    db
      .select({
        slug: jobs.slug,
        title: jobs.title,
        description: jobs.description,
        workMode: jobs.workMode,
        jobLocationCity: jobs.jobLocationCity,
        jobLocationRegion: jobs.jobLocationRegion,
        jobLocationCountry: jobs.jobLocationCountry,
        streetAddress: jobs.streetAddress,
        postalCode: jobs.postalCode,
        employmentType: jobs.employmentType,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        salaryCurrency: jobs.salaryCurrency,
        salaryInterval: jobs.salaryInterval,
        activatedAt: jobs.activatedAt,
        createdAt: jobs.createdAt,
        expiresAt: jobs.expiresAt,
        companyName: companies.name,
        companyWebsite: companies.website
      })
      .from(jobs)
      .leftJoin(companies, eq(jobs.companyId, companies.id))
      .where(getPublishedJobsFilter())
  ])
  const indexing = getGoogleIndexingConfigurationStatus()
  const eligibilitySummaries = activeJobsForSchema.map((job) => {
    const eligibility = buildEligibleJobPostingJsonLd({
      title: job.title,
      description: job.description,
      path: `/jobs/${job.slug}`,
      datePosted: job.activatedAt ?? job.createdAt,
      validThrough: job.expiresAt,
      employmentType: job.employmentType,
      hiringOrganizationName: job.companyName,
      hiringOrganizationWebsite: job.companyWebsite,
      jobLocation:
        job.workMode === "remote" || !job.jobLocationCity || !job.jobLocationRegion || !job.jobLocationCountry
          ? null
          : {
              city: job.jobLocationCity,
              region: job.jobLocationRegion,
              country: job.jobLocationCountry,
              streetAddress: job.streetAddress,
              postalCode: job.postalCode
            },
      applicantLocationCountry: "US",
      isRemote: job.workMode === "remote",
      baseSalary:
        job.salaryMin || job.salaryMax
          ? {
              currency: job.salaryCurrency ?? "USD",
              minValue: job.salaryMin,
              maxValue: job.salaryMax,
              unitText: job.salaryInterval ?? null
            }
          : null
    })

    return {
      slug: job.slug,
      title: job.title,
      reasons: eligibility.reasons
    }
  })
  const eligibilityCounts = summarizeJobPostingEligibility(eligibilitySummaries)

  return {
    counts: {
      activeJobPages: activeJobCountRows[0]?.total ?? 0,
      eligibleJobPostingCount: eligibilityCounts.eligibleJobPostingCount,
      activeJobsBlockedByMissingCompany: eligibilityCounts.activeJobsBlockedByMissingCompany,
      activeJobsBlockedByMissingLocation: eligibilityCounts.activeJobsBlockedByMissingLocation,
      activeJobsBlockedByOtherReasons: eligibilityCounts.activeJobsBlockedByOtherReasons,
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
      jobsMissingCompanyProfiles,
      schemaSuppressedJobs: eligibilityCounts.schemaSuppressedJobs
    },
    indexing
  }
}
