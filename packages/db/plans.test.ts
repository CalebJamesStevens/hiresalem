import { describe, expect, test } from "bun:test"

import {
  DEFAULT_COMPANY_PLAN_ID,
  getCompanyPlanEntitlements,
  isWithinCompanyActiveJobLimit,
  resolveCompanyPlan
} from "./plans"

describe("company plan entitlements", () => {
  test("defaults missing assignments to free", () => {
    const resolved = resolveCompanyPlan()

    expect(resolved.basePlanId).toBe(DEFAULT_COMPANY_PLAN_ID)
    expect(resolved.effectivePlanId).toBe("free")
    expect(resolved.source).toBe("default")
    expect(resolved.entitlements.maxActiveJobs).toBe(3)
    expect(resolved.entitlements.allowsSocialLinks).toBeFalse()
    expect(resolved.entitlements.allowsFeaturedJobs).toBeFalse()
  })

  test("resolves enhanced profile entitlements from assigned plan", () => {
    const resolved = resolveCompanyPlan({ plan: "enhanced_profile" })
    const { entitlements } = resolved

    expect(resolved.source).toBe("assigned")
    expect(entitlements.maxActiveJobs).toBe(3)
    expect(entitlements.allowsSocialLinks).toBeTrue()
    expect(entitlements.allowsEnhancedCompanyProfileSections).toBeTrue()
    expect(entitlements.allowsPerksAndBenefitsSection).toBeTrue()
    expect(entitlements.allowsCompanyMediaGallery).toBeTrue()
    expect(entitlements.allowsProfileHighlighting).toBeTrue()
    expect(entitlements.allowsFeaturedJobs).toBeFalse()
  })

  test("prefers manual overrides over assigned plans", () => {
    const resolved = resolveCompanyPlan({
      plan: "free",
      planOverride: "business_pro"
    })

    expect(resolved.basePlanId).toBe("free")
    expect(resolved.overridePlanId).toBe("business_pro")
    expect(resolved.effectivePlanId).toBe("business_pro")
    expect(resolved.source).toBe("override")
    expect(resolved.entitlements.maxActiveJobs).toBeNull()
    expect(resolved.entitlements.allowsFeaturedJobs).toBeTrue()
    expect(resolved.entitlements.allowsLongerJobDuration).toBeTrue()
  })

  test("keeps featured job profile entitlements scoped to job promotion features", () => {
    const entitlements = getCompanyPlanEntitlements("featured_job")

    expect(entitlements.maxActiveJobs).toBe(3)
    expect(entitlements.allowsFeaturedJobs).toBeTrue()
    expect(entitlements.allowsBoostedJobPlacement).toBeTrue()
    expect(entitlements.allowsLongerJobDuration).toBeTrue()
    expect(entitlements.allowsSocialLinks).toBeFalse()
    expect(entitlements.allowsEnhancedCompanyProfileSections).toBeFalse()
  })

  test("treats business pro as uncapped for active job limits", () => {
    expect(isWithinCompanyActiveJobLimit(3, "free")).toBeTrue()
    expect(isWithinCompanyActiveJobLimit(4, "free")).toBeFalse()
    expect(isWithinCompanyActiveJobLimit(25, "business_pro")).toBeTrue()
  })
})
