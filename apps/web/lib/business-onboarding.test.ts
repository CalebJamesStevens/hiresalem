import { describe, expect, test } from "bun:test"

import { getBusinessOnboardingRedirectPath, shouldGrantBusinessRole } from "@/lib/business-onboarding"

describe("getBusinessOnboardingRedirectPath", () => {
  test("allows signed-in job seekers to create a business profile", () => {
    expect(getBusinessOnboardingRedirectPath(["user"], false)).toBeNull()
  })

  test("allows business users without a linked company record to finish setup", () => {
    expect(getBusinessOnboardingRedirectPath(["business"], false)).toBeNull()
  })

  test("sends existing business accounts with a company to the profile editor", () => {
    expect(getBusinessOnboardingRedirectPath(["business"], true)).toBe("/dashboard/company")
  })

  test("keeps admins on the jobs dashboard", () => {
    expect(getBusinessOnboardingRedirectPath(["admin"], false)).toBe("/dashboard/jobs")
  })
})

describe("shouldGrantBusinessRole", () => {
  test("grants the role during the initial upgrade flow", () => {
    expect(shouldGrantBusinessRole(["user"])).toBe(true)
  })

  test("skips the role grant when the user already has business access", () => {
    expect(shouldGrantBusinessRole(["business"])).toBe(false)
  })
})
