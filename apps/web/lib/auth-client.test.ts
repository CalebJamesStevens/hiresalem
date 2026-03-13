import { describe, expect, test } from "bun:test"

import { getSignOutCallbackUrl } from "@/lib/auth-client"

describe("getSignOutCallbackUrl", () => {
  test("builds an absolute callback URL from the current origin", () => {
    expect(getSignOutCallbackUrl("https://hiresalem.com")).toBe("https://hiresalem.com/")
  })

  test("preserves localhost during local development", () => {
    expect(getSignOutCallbackUrl("http://localhost:3000")).toBe("http://localhost:3000/")
  })

  test("falls back to the relative path when the origin is unavailable", () => {
    expect(getSignOutCallbackUrl(undefined)).toBe("/")
  })

  test("falls back to the relative path when the origin is invalid", () => {
    expect(getSignOutCallbackUrl("not-a-url")).toBe("/")
  })
})
