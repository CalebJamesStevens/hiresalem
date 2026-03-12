import { describe, expect, test } from "bun:test"

import { buildEligibleJobPostingJsonLd } from "@/lib/job-posting"

describe("job posting eligibility", () => {
  test("builds schema for a valid on-site job", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Clinic Coordinator",
      description: "Support the clinic team in Salem.",
      path: "/jobs/clinic-coordinator",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      hiringOrganizationName: "HireSalem Clinic",
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US"
      }
    })

    expect(result.eligible).toBe(true)
    expect(result.reasons).toEqual([])
    expect(result.jsonLd?.jobLocation?.address.addressLocality).toBe("Salem")
  })

  test("builds schema for a valid remote job", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Remote Support Specialist",
      description: "Help customers from anywhere in the US.",
      path: "/jobs/remote-support-specialist",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      hiringOrganizationName: "HireSalem Support",
      isRemote: true,
      applicantLocationCountry: "US"
    })

    expect(result.eligible).toBe(true)
    expect(result.jsonLd?.jobLocationType).toBe("TELECOMMUTE")
    expect(result.jsonLd?.applicantLocationRequirements).toEqual({
      "@type": "Country",
      name: "US"
    })
  })

  test("suppresses schema when company is missing", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Missing Company Job",
      description: "Still a visible page.",
      path: "/jobs/missing-company-job",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US"
      }
    })

    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain("missing_hiring_organization")
    expect(result.jsonLd).toBeNull()
  })

  test("suppresses schema when non-remote location is missing", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Missing Location Job",
      description: "Still a visible page.",
      path: "/jobs/missing-location-job",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      hiringOrganizationName: "HireSalem"
    })

    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain("missing_job_location")
    expect(result.jsonLd).toBeNull()
  })

  test("treats employment type as optional", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Operations Coordinator",
      description: "Coordinate daily operations.",
      path: "/jobs/operations-coordinator",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      hiringOrganizationName: "HireSalem Operations",
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US"
      }
    })

    expect(result.eligible).toBe(true)
    expect(result.jsonLd?.employmentType).toBeUndefined()
  })

  test("does not emit directApply markup", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Operations Coordinator",
      description: "Coordinate daily operations.",
      path: "/jobs/operations-coordinator",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      hiringOrganizationName: "HireSalem Operations",
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US"
      }
    })

    expect(result.jsonLd && "directApply" in result.jsonLd).toBe(false)
  })

  test("omits inconsistent employment types instead of emitting bad schema", () => {
    const result = buildEligibleJobPostingJsonLd({
      title: "Watch Specialist",
      description: "This is a full-time permanent employee position.",
      path: "/jobs/watch-specialist",
      datePosted: new Date("2026-03-11T12:00:00.000Z"),
      employmentType: "internship",
      hiringOrganizationName: "OEM",
      jobLocation: {
        city: "Salem",
        region: "OR",
        country: "US"
      }
    })

    expect(result.eligible).toBe(true)
    expect(result.jsonLd?.employmentType).toBeUndefined()
  })
})
