import { describe, expect, test } from "bun:test"

import { allJobsLandingLinks, allResourceArticleLinks, jobsLandingPages, resourceArticles } from "@/lib/seo-taxonomy"
import { parseJobsSearchParams } from "@/lib/job-search"
import { buildPageMetadata, getJobsPageCanonicalPath, getJobsPageRobots } from "@/lib/seo"
import { buildJobPostingJsonLd, normalizeJobLocation } from "@/lib/structured-data"

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
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US",
        streetAddress: "123 Liberty St NE",
        postalCode: "97301"
      }
    })

    expect(jsonLd.employmentType).toBe("FULL_TIME")
    expect(jsonLd.url).toBe("https://hiresalem.com/jobs/front-desk-coordinator")
    expect(jsonLd.jobLocation?.address.streetAddress).toBe("123 Liberty St NE")
    expect(jsonLd.jobLocation?.address.postalCode).toBe("97301")
  })

  test("emits validThrough and uses external employer website for sameAs", () => {
    const validThrough = new Date("2026-04-01T12:00:00.000Z")
    const jsonLd = buildJobPostingJsonLd({
      title: "Operations Manager",
      description: "Lead daily operations.",
      path: "/jobs/operations-manager",
      datePosted: new Date("2026-03-06T12:00:00.000Z"),
      validThrough,
      hiringOrganizationName: "Acme Logistics",
      hiringOrganizationWebsite: "https://acme.example"
    })

    expect(jsonLd.validThrough).toBe(validThrough.toISOString())
    expect(jsonLd.hiringOrganization?.sameAs).toEqual(["https://acme.example"])
  })

  test("emits remote-specific job posting fields without a fake remote address", () => {
    const jsonLd = buildJobPostingJsonLd({
      title: "Remote Support Specialist",
      description: "Help customers from anywhere in the US.",
      path: "/jobs/remote-support-specialist",
      datePosted: new Date("2026-03-06T12:00:00.000Z"),
      hiringOrganizationName: "Acme Support",
      isRemote: true,
      applicantLocationCountry: "US"
    })

    expect(jsonLd.jobLocationType).toBe("TELECOMMUTE")
    expect(jsonLd.applicantLocationRequirements).toEqual({
      "@type": "Country",
      name: "US"
    })
    expect(jsonLd.jobLocation).toBeUndefined()
  })

  test("normalizes salary interval values for job posting schema", () => {
    const intervals = {
      hour: "HOUR",
      week: "WEEK",
      month: "MONTH",
      year: "YEAR"
    } as const

    for (const [unitText, expected] of Object.entries(intervals)) {
      const jsonLd = buildJobPostingJsonLd({
        title: "Warehouse Associate",
        description: "Move inventory safely.",
        path: "/jobs/warehouse-associate",
        datePosted: new Date("2026-03-06T12:00:00.000Z"),
        baseSalary: {
          currency: "USD",
          minValue: 20,
          unitText
        }
      })

      expect(jsonLd.baseSalary?.value.unitText).toBe(expected)
    }
  })

  test("normalizes common Salem-area job locations conservatively", () => {
    expect(normalizeJobLocation("Salem")).toEqual({
      city: "Salem",
      region: "OR",
      country: "US"
    })
    expect(normalizeJobLocation("Salem, OR")).toEqual({
      city: "Salem",
      region: "OR",
      country: "US"
    })
    expect(normalizeJobLocation("Salem, Oregon")).toEqual({
      city: "Salem",
      region: "OR",
      country: "US"
    })
    expect(normalizeJobLocation("Remote")).toBeNull()
    expect(normalizeJobLocation("Salem / Keizer")).toEqual({
      city: "Salem",
      region: "OR",
      country: "US"
    })
  })
})

describe("SEO content config", () => {
  test("uses unique paths across landing pages and resources", () => {
    const paths = [...jobsLandingPages.map((page) => page.path), ...resourceArticles.map((article) => article.path)]

    expect(new Set(paths).size).toBe(paths.length)
  })

  test("exposes HTML crawl hubs for every landing page and resource", () => {
    expect(new Set(allJobsLandingLinks.map((item) => item.href))).toEqual(new Set(jobsLandingPages.map((page) => page.path)))
    expect(new Set(allResourceArticleLinks.map((item) => item.href))).toEqual(new Set(resourceArticles.map((article) => article.path)))
  })
})
