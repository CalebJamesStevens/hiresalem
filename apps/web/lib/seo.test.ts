import { describe, expect, test } from "bun:test"

import { jobsLandingPages, resourceArticles } from "@/lib/seo-taxonomy"
import { parseJobsSearchParams } from "@/lib/job-search"
import { buildPageMetadata, getJobsPageCanonicalPath, getJobsPageRobots } from "@/lib/seo"
import { buildJobPostingJsonLd } from "@/lib/structured-data"

describe("jobs index SEO rules", () => {
  test("keeps the clean jobs page indexable", () => {
    const params = parseJobsSearchParams({})

    expect(getJobsPageCanonicalPath(params)).toBe("/jobs")
    expect(getJobsPageRobots(params)).toBeUndefined()
  })

  test("noindexes filtered jobs pages and points canonicals at the main index", () => {
    const params = parseJobsSearchParams({
      q: "healthcare",
      location: "Salem"
    })

    expect(getJobsPageCanonicalPath(params)).toBe("/jobs")
    expect(getJobsPageRobots(params)).toEqual({
      index: false,
      follow: true
    })
  })
})

describe("page metadata", () => {
  test("builds absolute canonicals", () => {
    const metadata = buildPageMetadata({
      title: "Salem Jobs",
      description: "Browse Salem jobs.",
      path: "/jobs/salem"
    })

    expect(metadata.alternates?.canonical).toBe("https://hiresalem.com/jobs/salem")
  })
})

describe("structured data helpers", () => {
  test("maps employment types for job posting schema", () => {
    const jsonLd = buildJobPostingJsonLd({
      title: "Front Desk Coordinator",
      description: "Support a Salem clinic team.",
      path: "/jobs/front-desk-coordinator",
      datePosted: new Date("2026-03-06T12:00:00.000Z"),
      employmentType: "full_time",
      hiringOrganizationName: "HireSalem Clinic",
      jobLocation: "Salem"
    })

    expect(jsonLd.employmentType).toBe("FULL_TIME")
    expect(jsonLd.url).toBe("https://hiresalem.com/jobs/front-desk-coordinator")
  })
})

describe("SEO content config", () => {
  test("uses unique paths across landing pages and resources", () => {
    const paths = [...jobsLandingPages.map((page) => page.path), ...resourceArticles.map((article) => article.path)]

    expect(new Set(paths).size).toBe(paths.length)
  })
})
