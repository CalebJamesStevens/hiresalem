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
    expect(resolved.entitlements.maxActiveJobs).toBe(2)
    expect(resolved.entitlements.allowsSocialLinks).toBeFalse()
    expect(resolved.entitlements.allowsFeaturedJobs).toBeFalse()
  })

  test("resolves standard entitlements from assigned plan", () => {
    const resolved = resolveCompanyPlan({ plan: "standard" })
    const { entitlements } = resolved

    expect(resolved.source).toBe("assigned")
    expect(entitlements.maxActiveJobs).toBeNull()
    expect(entitlements.allowsSocialLinks).toBeTrue()
    expect(entitlements.allowsEnhancedCompanyProfileSections).toBeTrue()
    expect(entitlements.allowsPerksAndBenefitsSection).toBeTrue()
    expect(entitlements.allowsCompanyMediaGallery).toBeTrue()
    expect(entitlements.allowsProfileHighlighting).toBeTrue()
    expect(entitlements.allowsFeaturedJobs).toBeTrue()
    expect(entitlements.maxFeaturedJobs).toBe(1)
    expect(entitlements.jobExpiresAfterDays).toBeNull()
  })

  test("prefers manual overrides over assigned plans", () => {
    const resolved = resolveCompanyPlan({
      plan: "free",
      planOverride: "partner"
    })

    expect(resolved.basePlanId).toBe("free")
    expect(resolved.overridePlanId).toBe("partner")
    expect(resolved.effectivePlanId).toBe("partner")
    expect(resolved.source).toBe("override")
    expect(resolved.entitlements.maxActiveJobs).toBeNull()
    expect(resolved.entitlements.allowsFeaturedJobs).toBeTrue()
    expect(resolved.entitlements.maxFeaturedJobs).toBeNull()
    expect(resolved.entitlements.includesTopEmployerSlot).toBeTrue()
  })

  test("keeps partner entitlements scoped to premium visibility and enhanced presence", () => {
    const entitlements = getCompanyPlanEntitlements("partner")

    expect(entitlements.maxActiveJobs).toBeNull()
    expect(entitlements.allowsFeaturedJobs).toBeTrue()
    expect(entitlements.allowsBoostedJobPlacement).toBeTrue()
    expect(entitlements.maxFeaturedJobs).toBeNull()
    expect(entitlements.allowsSocialLinks).toBeTrue()
    expect(entitlements.allowsEnhancedCompanyProfileSections).toBeTrue()
  })

  test("treats standard and partner as uncapped for active job limits", () => {
    expect(isWithinCompanyActiveJobLimit(2, "free")).toBeTrue()
    expect(isWithinCompanyActiveJobLimit(3, "free")).toBeFalse()
    expect(isWithinCompanyActiveJobLimit(25, "standard")).toBeTrue()
    expect(isWithinCompanyActiveJobLimit(25, "partner")).toBeTrue()
  })
})
