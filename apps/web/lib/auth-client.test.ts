import { describe, expect, test } from "bun:test"

import { getSignOutCallbackUrl } from "@/lib/auth-client"

describe("getSignOutCallbackUrl", () => {
  test("returns a relative callback path for production origins", () => {
    expect(getSignOutCallbackUrl("https://hiresalem.com")).toBe("/")
  })

  test("returns a relative callback path for localhost origins", () => {
    expect(getSignOutCallbackUrl("http://localhost:3000")).toBe("/")
  })

  test("falls back to the relative path when the origin is unavailable", () => {
    expect(getSignOutCallbackUrl(undefined)).toBe("/")
  })

  test("normalizes non-root relative paths", () => {
    expect(getSignOutCallbackUrl("https://hiresalem.com", "/dashboard")).toBe("/dashboard")
  })

  test("falls back to root when the provided path is not site-relative", () => {
    expect(getSignOutCallbackUrl("not-a-url", "dashboard")).toBe("/")
  })
})
