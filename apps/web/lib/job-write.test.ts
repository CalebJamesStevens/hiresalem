import { describe, expect, test } from "bun:test"

import { getJobPublicationValidationReasons } from "@/lib/job-write"

describe("job publication validation", () => {
  test("requires company and structured location for non-remote jobs", () => {
    expect(
      getJobPublicationValidationReasons({
        companyId: null,
        description: "A valid description.",
        workMode: "onsite",
        jobLocationCity: null,
        jobLocationRegion: null,
        jobLocationCountry: null
      })
    ).toEqual([
      "missing_company",
      "missing_job_location_city",
      "missing_job_location_region",
      "missing_job_location_country"
    ])
  })

  test("does not require structured location for remote jobs", () => {
    expect(
      getJobPublicationValidationReasons({
        companyId: "company-1",
        description: "A valid description.",
        workMode: "remote",
        jobLocationCity: null,
        jobLocationRegion: null,
        jobLocationCountry: null
      })
    ).toEqual([])
  })

  test("requires a description before publication", () => {
    expect(
      getJobPublicationValidationReasons({
        companyId: "company-1",
        description: "   ",
        workMode: "hybrid",
        jobLocationCity: "Salem",
        jobLocationRegion: "OR",
        jobLocationCountry: "US"
      })
    ).toEqual(["missing_description"])
  })
})
