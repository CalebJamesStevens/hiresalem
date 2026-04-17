import { describe, expect, test } from "bun:test"

import {
  buildCompanyProfilePageDescription,
  canManageCompanyProfile,
  getCompanyPublicProfileContent,
  getCompanyProfileInitials,
  getCompanyPlanValidationErrorCode,
  hasIndexableCompanyProfileContent,
  shouldBackfillCompanyAsClaimed,
  normalizeCompanyWebsite,
  parseCompanyPlanInput,
  parseCompanyProfileInput,
  parseCompanyProfileInputForPlan
} from "@/lib/companies"
import { resolveCompanyPlan } from "@repo/db/plans"

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
      location: "Salem, OR",
      linkedinUrl: null,
      facebookUrl: null,
      instagramUrl: null,
      aboutSection: null,
      whyWorkHere: null,
      benefits: null,
      coverImageUrl: null,
      galleryImageUrl1: null,
      galleryImageUrl2: null
    })
  })

  test("accepts uploaded logo storage keys", () => {
    const parsed = parseCompanyProfileInput({
      name: "Acme Health",
      logoUrl: "company-images/123e4567-e89b-12d3-a456-426614174000.png",
      shortDescription: "",
      website: "",
      location: ""
    })

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    expect(parsed.data.logoUrl).toBe("company-images/123e4567-e89b-12d3-a456-426614174000.png")
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

describe("parseCompanyProfileInputForPlan", () => {
  test("rejects enhanced-only social links on the free plan", () => {
    const parsed = parseCompanyProfileInputForPlan(
      {
        name: "Acme Health",
        logoUrl: "",
        shortDescription: "",
        website: "",
        location: "",
        linkedinUrl: "https://linkedin.com/company/acme-health"
      },
      resolveCompanyPlan({ plan: "free" })
    )

    expect(parsed.success).toBe(false)

    if (parsed.success) {
      return
    }

    expect("errorCode" in parsed ? parsed.errorCode : null).toBe("plan_locked_social_links")
  })

  test("accepts enhanced fields when the plan allows them", () => {
    const parsed = parseCompanyProfileInputForPlan(
      {
        name: "Acme Health",
        logoUrl: "",
        shortDescription: "",
        website: "",
        location: "",
        linkedinUrl: "https://linkedin.com/company/acme-health",
        aboutSection: "Mission driven local care.",
        whyWorkHere: "Strong clinical mentorship.",
        benefits: "- Health coverage",
        coverImageUrl: "https://example.com/cover.jpg",
        galleryImageUrl1: "https://example.com/gallery-1.jpg",
        galleryImageUrl2: ""
      },
      resolveCompanyPlan({ plan: "standard" })
    )

    expect(parsed.success).toBe(true)
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
      plan: "standard",
      planOverride: "standard",
      planOverrideReason: "  Chamber pilot  "
    })

    expect(parsed.success).toBe(true)

    if (!parsed.success) {
      return
    }

    expect(parsed.data).toEqual({
      plan: "standard",
      planOverride: null,
      planOverrideReason: "Chamber pilot",
      isManaged: false
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

  test("hides enhanced sections for free-plan companies even if data exists", () => {
    const profile = getCompanyPublicProfileContent({
      shortDescription: "Local care team.",
      linkedinUrl: "https://linkedin.com/company/acme-health",
      facebookUrl: null,
      instagramUrl: null,
      aboutSection: "Expanded story",
      whyWorkHere: "Great culture",
      benefits: "Health coverage",
      coverImageUrl: "https://example.com/cover.jpg",
      galleryImageUrl1: "https://example.com/1.jpg",
      galleryImageUrl2: "https://example.com/2.jpg",
      plan: "free",
      planOverride: null
    })

    expect(profile.socialLinks).toEqual([])
    expect(profile.aboutSection).toBeNull()
    expect(profile.whyWorkHere).toBeNull()
    expect(profile.benefits).toBeNull()
    expect(profile.coverImageUrl).toBeNull()
    expect(profile.galleryImageUrls).toEqual([])
    expect(profile.usesEnhancedPresentation).toBe(false)
  })

  test("returns enhanced sections for standard companies", () => {
    const profile = getCompanyPublicProfileContent({
      shortDescription: "Local care team.",
      linkedinUrl: "https://linkedin.com/company/acme-health",
      facebookUrl: null,
      instagramUrl: "https://instagram.com/acmehealth",
      aboutSection: "Expanded story",
      whyWorkHere: "Great culture",
      benefits: "Health coverage",
      coverImageUrl: "https://example.com/cover.jpg",
      galleryImageUrl1: "https://example.com/1.jpg",
      galleryImageUrl2: "https://example.com/2.jpg",
      plan: "standard",
      planOverride: null
    })

    expect(profile.socialLinks.map((link) => link.id)).toEqual(["linkedinUrl", "instagramUrl"])
    expect(profile.aboutSection).toBe("Expanded story")
    expect(profile.whyWorkHere).toBe("Great culture")
    expect(profile.benefits).toBe("Health coverage")
    expect(profile.coverImageUrl).toBe("https://example.com/cover.jpg")
    expect(profile.galleryImageUrls).toEqual(["https://example.com/1.jpg", "https://example.com/2.jpg"])
    expect(profile.usesEnhancedPresentation).toBe(true)
  })

  test("treats filled-out profiles as indexable even without active jobs", () => {
    expect(
      hasIndexableCompanyProfileContent({
        shortDescription: "Community employer serving Salem.",
        aboutSection: null,
        whyWorkHere: null,
        benefits: null,
        socialLinks: [],
        coverImageUrl: null,
        galleryImageUrls: []
      })
    ).toBe(true)

    expect(
      hasIndexableCompanyProfileContent({
        shortDescription: null,
        aboutSection: null,
        whyWorkHere: null,
        benefits: null,
        socialLinks: [],
        coverImageUrl: null,
        galleryImageUrls: []
      })
    ).toBe(false)
  })
})

describe("company claim helpers", () => {
  test("backfills claimed companies only for non-import owners", () => {
    expect(shouldBackfillCompanyAsClaimed("user-123")).toBe(true)
    expect(shouldBackfillCompanyAsClaimed("system:acme-health")).toBe(false)
    expect(shouldBackfillCompanyAsClaimed("admin-1:company:acme-health")).toBe(false)
  })
})
