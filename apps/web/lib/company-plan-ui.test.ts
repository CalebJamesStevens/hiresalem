import { describe, expect, test } from "bun:test"

import { getEmployerPlanIncludedHighlights, getEmployerPlanUpgradeHighlights, getLockedCompanyFeatureMessage } from "@/lib/company-plan-ui"
import { resolveCompanyPlan } from "@repo/db/plans"

describe("company plan UI helpers", () => {
  test("prioritizes richer profile and featured visibility upgrades for the free plan", () => {
    const plan = resolveCompanyPlan({ plan: "free" })
    const upgradeHighlights = getEmployerPlanUpgradeHighlights(plan)

    expect(upgradeHighlights.map((item) => item.id)).toEqual([
      "social_links",
      "enhanced_company_story",
      "company_media",
      "featured_job_visibility",
      "higher_job_limit"
    ])
  })

  test("formats featured placement availability for locked job promotion", () => {
    const plan = resolveCompanyPlan({ plan: "free" })
    const feature = getLockedCompanyFeatureMessage(plan, "featured_job_visibility")

    expect(feature?.availabilityLabel).toBe("Available on Featured Job or Business Pro")
  })

  test("shows no upgrade-only capabilities for business pro", () => {
    const plan = resolveCompanyPlan({ plan: "business_pro" })

    expect(getEmployerPlanUpgradeHighlights(plan)).toHaveLength(0)
    expect(getEmployerPlanIncludedHighlights(plan)).toContain("More than 3 live jobs can stay active at once.")
  })
})
