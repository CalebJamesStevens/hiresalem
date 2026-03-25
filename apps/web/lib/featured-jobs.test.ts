import { describe, expect, test } from "bun:test"

import { canUseFeaturedJobs, featuresAllJobs, getNextFeaturedAt, isJobFeaturedForPlan, shouldBoostFeaturedJobs, validateFeaturedJobRequest } from "@/lib/featured-jobs"
import { resolveCompanyPlan } from "@repo/db/plans"

describe("featured job helpers", () => {
  test("allows featured placement on paid plans", () => {
    expect(canUseFeaturedJobs(resolveCompanyPlan({ plan: "standard" }))).toBe(true)
    expect(canUseFeaturedJobs(resolveCompanyPlan({ plan: "partner" }))).toBe(true)
    expect(canUseFeaturedJobs(resolveCompanyPlan({ plan: "free" }))).toBe(false)
  })

  test("rejects new featured placement on ineligible plans", () => {
    expect(validateFeaturedJobRequest(true, resolveCompanyPlan({ plan: "free" }))).toEqual({
      ok: false,
      error: "featured_job_plan_required"
    })
  })

  test("allows preserving an existing featured flag after plan loss", () => {
    expect(
      validateFeaturedJobRequest(true, resolveCompanyPlan({ plan: "free" }), {
        allowExistingFeatured: true
      })
    ).toEqual({
      ok: true,
      isFeatured: true
    })
  })

  test("marks partner plans as auto-featured for every listing", () => {
    expect(featuresAllJobs(resolveCompanyPlan({ plan: "partner" }))).toBe(true)
    expect(featuresAllJobs(resolveCompanyPlan({ plan: "standard" }))).toBe(false)
  })

  test("treats partner listings as featured even without a stored featured flag", () => {
    expect(
      isJobFeaturedForPlan(
        {
          isFeatured: false,
          featuredExpiresAt: null
        },
        resolveCompanyPlan({ plan: "partner" })
      )
    ).toBe(true)
  })

  test("only boosts approved search modes", () => {
    expect(
      shouldBoostFeaturedJobs({
        q: "",
        location: "",
        workMode: "any",
        employmentType: "any",
        category: "any",
        applyType: "any",
        postedWithin: "any",
        minSalary: "",
        sort: "newest",
        page: 1
      })
    ).toBe(true)

    expect(
      shouldBoostFeaturedJobs({
        q: "designer",
        location: "",
        workMode: "any",
        employmentType: "any",
        category: "any",
        applyType: "any",
        postedWithin: "any",
        minSalary: "",
        sort: "relevance",
        page: 1
      })
    ).toBe(true)

    expect(
      shouldBoostFeaturedJobs({
        q: "",
        location: "",
        workMode: "any",
        employmentType: "any",
        category: "any",
        applyType: "any",
        postedWithin: "any",
        minSalary: "",
        sort: "salary_high_to_low",
        page: 1
      })
    ).toBe(false)
  })

  test("preserves existing featured timestamps and clears them when unfeatured", () => {
    const featuredAt = new Date("2026-03-12T18:00:00.000Z")

    expect(
      getNextFeaturedAt({
        requestedIsFeatured: true,
        existingIsFeatured: true,
        featuredAt
      })
    ).toBe(featuredAt)

    expect(
      getNextFeaturedAt({
        requestedIsFeatured: false,
        existingIsFeatured: true,
        featuredAt
      })
    ).toBeNull()
  })

  test("treats active add-on features as visible even without a plan slot", () => {
    expect(
      isJobFeaturedForPlan(
        {
          isFeatured: false,
          featuredExpiresAt: new Date("2026-03-30T18:00:00.000Z")
        },
        resolveCompanyPlan({ plan: "free" }),
        new Date("2026-03-23T18:00:00.000Z")
      )
    ).toBe(true)
  })

  test("does not treat expired add-on boosts as permanent Standard spotlights", () => {
    expect(
      isJobFeaturedForPlan(
        {
          isFeatured: false,
          featuredExpiresAt: new Date("2026-03-20T18:00:00.000Z")
        },
        resolveCompanyPlan({ plan: "standard" }),
        new Date("2026-03-23T18:00:00.000Z")
      )
    ).toBe(false)
  })
})
