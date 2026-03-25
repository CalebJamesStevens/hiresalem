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
      "higher_job_limit",
      "top_employer_slot"
    ])
  })

  test("formats featured placement availability for locked job promotion", () => {
    const plan = resolveCompanyPlan({ plan: "free" })
    const feature = getLockedCompanyFeatureMessage(plan, "featured_job_visibility")

    expect(feature?.availabilityLabel).toBe("Available on Standard or Partner")
  })

  test("shows no upgrade-only capabilities for partner", () => {
    const plan = resolveCompanyPlan({ plan: "partner" })

    expect(getEmployerPlanUpgradeHighlights(plan)).toHaveLength(0)
    expect(getEmployerPlanIncludedHighlights(plan)).toContain("Unlimited live jobs can stay active at once.")
  })
})
