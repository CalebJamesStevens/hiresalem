import { describe, expect, test } from "bun:test"

import { normalizeCompanyWebsite } from "@/lib/companies"

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
