import { describe, expect, test } from "bun:test"

import { getEmployerExistingAccountHref, getEmployerPlanSelectionHref, getEmployerSelfServePlan, getEmployerStartHref } from "@/lib/employer-self-serve"

describe("employer self-serve helpers", () => {
  test("normalizes invalid plan values to Community", () => {
    expect(getEmployerSelfServePlan("invalid")).toBe("free")
    expect(getEmployerSelfServePlan("standard")).toBe("standard")
    expect(getEmployerSelfServePlan("partner")).toBe("partner")
  })

  test("builds entry and continuation paths for paid plans", () => {
    expect(getEmployerStartHref("standard")).toBe("/employers/start?plan=standard")
    expect(getEmployerPlanSelectionHref("standard")).toBe("/dashboard/plan?selectedPlan=standard&onboarding=1&_fb_event=CompleteRegistration#pricing")
    expect(getEmployerExistingAccountHref("partner")).toBe("/dashboard/plan?selectedPlan=partner#pricing")
  })

  test("includes a one-time Meta pixel completion event on successful business onboarding", () => {
    expect(getEmployerPlanSelectionHref("free")).toBe("/dashboard/company?welcome=1&_fb_event=CompleteRegistration")
  })
})
