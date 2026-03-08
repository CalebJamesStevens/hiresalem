import { describe, expect, it } from "bun:test"

import { GET } from "@/app/api/analytics/email-click/route"

describe("email click redirect", () => {
  it("redirects to the public app URL instead of the internal request origin", async () => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = "https://hiresalem.com"

    try {
      const response = await GET(new Request("http://localhost:3000/api/analytics/email-click?target=/jobs/test-role"))

      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://hiresalem.com/jobs/test-role?_gc_event=email_digest_click")
    } finally {
      if (previousAppUrl === undefined) {
        delete process.env.NEXT_PUBLIC_APP_URL
      } else {
        process.env.NEXT_PUBLIC_APP_URL = previousAppUrl
      }
    }
  })
})
