import { describe, expect, test } from "bun:test"

import { summarizeJobPostingEligibility } from "@/lib/seo-dashboard"

describe("seo dashboard eligibility summaries", () => {
  test("groups schema blockers into dashboard counts", () => {
    const summary = summarizeJobPostingEligibility([
      {
        slug: "eligible-job",
        title: "Eligible Job",
        reasons: []
      },
      {
        slug: "missing-company",
        title: "Missing Company",
        reasons: ["missing_hiring_organization"]
      },
      {
        slug: "missing-location",
        title: "Missing Location",
        reasons: ["missing_job_location"]
      },
      {
        slug: "missing-description",
        title: "Missing Description",
        reasons: ["missing_description"]
      }
    ])

    expect(summary.eligibleJobPostingCount).toBe(1)
    expect(summary.activeJobsBlockedByMissingCompany).toBe(1)
    expect(summary.activeJobsBlockedByMissingLocation).toBe(1)
    expect(summary.activeJobsBlockedByOtherReasons).toBe(1)
    expect(summary.schemaSuppressedJobs).toHaveLength(3)
  })
})
