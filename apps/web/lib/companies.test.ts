import { describe, expect, test } from "bun:test"

import {
  buildCompanyProfilePageDescription,
  canManageCompanyProfile,
  getCompanyProfileInitials,
  getCompanyPlanValidationErrorCode,
  normalizeCompanyWebsite,
  parseCompanyPlanInput,
  parseCompanyProfileInput
} from "@/lib/companies"

describe("normalizeCompanyWebsite", () => {
  test("returns null for blank input", () => {
    expect(normalizeCompanyWebsite("   ")).toBeNull()
  })

  test("normalizes valid urls", () => {
    expect(normalizeCompanyWebsite("https://example.com")).toBe("https://example.com/")
  })

  test("rejects invalid urls", () => {
    expect(normalizeCompanyWebsite("not-a-url")).toBeNull()
  })
})

describe("parseCompanyProfileInput", () => {
  test("accepts valid free-plan profile fields and normalizes blanks", () => {
    const parsed = parseCompanyProfileInput({
      name: "  Acme Health  ",
      logoUrl: "https://example.com/logo.png",
      shortDescription: "  Community healthcare team serving Salem families.  ",
      website: "https://example.com",
      location: " Salem, OR "
    })

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    expect(parsed.data).toEqual({
      name: "Acme Health",
      logoUrl: "https://example.com/logo.png",
      shortDescription: "Community healthcare team serving Salem families.",
      website: "https://example.com",
      location: "Salem, OR"
    })
  })

  test("rejects invalid logo urls", () => {
    const parsed = parseCompanyProfileInput({
      name: "Acme Health",
      logoUrl: "not-a-url",
      shortDescription: "",
      website: "",
      location: ""
    })

    expect(parsed.success).toBe(false)
  })

  test("rejects descriptions above the free-plan limit", () => {
    const parsed = parseCompanyProfileInput({
      name: "Acme Health",
      logoUrl: "",
      shortDescription: "x".repeat(281),
      website: "",
      location: ""
    })

    expect(parsed.success).toBe(false)
  })
})

describe("canManageCompanyProfile", () => {
  test("allows admins to edit any company", () => {
    expect(
      canManageCompanyProfile(
        {
          id: "user-1",
          isAdmin: true
        },
        "owner-2"
      )
    ).toBe(true)
  })

  test("restricts business users to their own company", () => {
    expect(
      canManageCompanyProfile(
        {
          id: "owner-1",
          isAdmin: false
        },
        "owner-1"
      )
    ).toBe(true)

    expect(
      canManageCompanyProfile(
        {
          id: "owner-1",
          isAdmin: false
        },
        "owner-2"
      )
    ).toBe(false)
  })
})

describe("parseCompanyPlanInput", () => {
  test("normalizes matching overrides away and trims internal notes", () => {
    const parsed = parseCompanyPlanInput({
      plan: "enhanced_profile",
      planOverride: "enhanced_profile",
      planOverrideReason: "  Chamber pilot  "
    })

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    expect(parsed.data).toEqual({
      plan: "enhanced_profile",
      planOverride: null,
      planOverrideReason: "Chamber pilot"
    })
  })

  test("rejects invalid plan ids", () => {
    const parsed = parseCompanyPlanInput({
      plan: "gold",
      planOverride: "",
      planOverrideReason: ""
    })

    expect(parsed.success).toBe(false)

    if (parsed.success) {
      return
    }

    expect(getCompanyPlanValidationErrorCode(parsed.error)).toBe("invalid_company_plan")
  })
})

describe("public company profile helpers", () => {
  test("builds a profile description from free-plan company fields", () => {
    expect(
      buildCompanyProfilePageDescription({
        name: "Acme Health",
        shortDescription: "Community healthcare team serving Salem families.",
        location: "Salem, OR",
        activeJobCount: 2
      })
    ).toContain("Community healthcare team serving Salem families.")
  })

  test("falls back to company initials when no logo is present", () => {
    expect(getCompanyProfileInitials("Willamette Works")).toBe("WW")
    expect(getCompanyProfileInitials("Acme")).toBe("A")
  })
})
