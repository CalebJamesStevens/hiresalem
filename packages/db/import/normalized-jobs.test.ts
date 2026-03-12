import { describe, expect, test } from "bun:test"

import { getActiveImportEligibilityReasons, inferStructuredJobLocationFromLegacyText, parseNormalizedJobsImport, type NormalizedJob } from "./normalized-jobs"

function buildNormalizedJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    slug: "salem-job",
    title: "Salem Job",
    ownerAuthId: "system",
    companySlug: "hire-salem",
    location: "Salem, OR",
    jobLocationCity: "Salem",
    jobLocationRegion: "OR",
    jobLocationCountry: "US",
    streetAddress: null,
    postalCode: null,
    salary: null,
    workMode: "onsite",
    employmentType: "full_time",
    category: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryInterval: null,
    description: "This is a full-time employee role in Salem.",
    applyType: "external",
    applyUrl: "https://example.com/apply",
    isActive: true,
    listingDurationDays: 30,
    paymentStatus: "paid",
    activatedAt: new Date("2026-03-11T12:00:00.000Z"),
    expiresAt: new Date("2026-04-10T12:00:00.000Z"),
    createdAt: new Date("2026-03-11T12:00:00.000Z"),
    ...overrides
  }
}

describe("normalized job import eligibility", () => {
  test("infers structured job location from legacy location text", () => {
    expect(inferStructuredJobLocationFromLegacyText("Salem, OR (DOR Revenue Building)")).toEqual({
      city: "Salem",
      region: "OR",
      country: "US"
    })
  })

  test("rejects active rows without a company", () => {
    const reasons = getActiveImportEligibilityReasons(buildNormalizedJob(), false)

    expect(reasons).toContain("Active imported jobs must reference a valid company profile.")
  })

  test("rejects active non-remote rows without structured location", () => {
    const reasons = getActiveImportEligibilityReasons(
      buildNormalizedJob({
        jobLocationCity: null,
        jobLocationRegion: null,
        jobLocationCountry: null
      }),
      true
    )

    expect(reasons).toContain("Active non-remote imported jobs must include jobLocationCity, jobLocationRegion, and jobLocationCountry.")
  })

  test("rejects conflicting imported employment types", () => {
    const reasons = getActiveImportEligibilityReasons(
      buildNormalizedJob({
        employmentType: "internship",
        description: "Position Type: Employee. This is a full-time permanent position."
      }),
      true
    )

    expect(reasons).toContain("Imported employmentType conflicts with the visible job description.")
  })

  test("accepts valid active imports", () => {
    const reasons = getActiveImportEligibilityReasons(buildNormalizedJob(), true)

    expect(reasons).toEqual([])
  })

  test("normalizes legacy location-only payloads into structured fields", () => {
    const payload = parseNormalizedJobsImport({
      companies: [
        {
          slug: "department-of-revenue",
          name: "Department of Revenue"
        }
      ],
      jobs: [
        {
          slug: "office-specialist-1-two-positions-req-196152",
          title: "Office Specialist 1 (Two positions)",
          companyId: "department-of-revenue",
          location: "Salem, OR (DOR Revenue Building)",
          workMode: "hybrid",
          employmentType: "full_time",
          description: "This is a full-time employee role in Salem.",
          applyType: "external",
          applyUrl: "https://example.com/apply",
          isActive: true,
          listingDurationDays: 7,
          paymentStatus: "paid",
          activatedAt: "2026-03-10T07:00:00.000Z",
          expiresAt: "2026-03-18T06:59:59.000Z",
          createdAt: "2026-03-10T07:00:00.000Z"
        }
      ]
    })

    expect(payload.jobs[0]?.jobLocationCity).toBe("Salem")
    expect(payload.jobs[0]?.jobLocationRegion).toBe("OR")
    expect(payload.jobs[0]?.jobLocationCountry).toBe("US")
  })
})
