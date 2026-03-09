import { describe, expect, test } from "bun:test"

import { getGoogleIndexingNotificationTypeForJobTransition } from "@/lib/job-indexing"

const publishedJob = {
  slug: "salem-job",
  isActive: true,
  paymentStatus: "paid" as const,
  expiresAt: new Date("2026-03-12T00:00:00.000Z")
}

describe("job indexing transitions", () => {
  test("publishing a job sends URL_UPDATED", () => {
    expect(
      getGoogleIndexingNotificationTypeForJobTransition({
        before: null,
        after: publishedJob
      })
    ).toBe("URL_UPDATED")
  })

  test("closing a published job sends URL_DELETED", () => {
    expect(
      getGoogleIndexingNotificationTypeForJobTransition({
        before: publishedJob,
        after: {
          ...publishedJob,
          isActive: false
        }
      })
    ).toBe("URL_DELETED")
  })

  test("no-op transitions do not notify Google", () => {
    expect(
      getGoogleIndexingNotificationTypeForJobTransition({
        before: {
          ...publishedJob,
          isActive: false,
          paymentStatus: "pending"
        },
        after: {
          ...publishedJob,
          isActive: false,
          paymentStatus: "canceled"
        }
      })
    ).toBeNull()
  })
})
