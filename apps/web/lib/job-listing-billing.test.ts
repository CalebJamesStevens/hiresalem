import { describe, expect, test } from "bun:test"

import { getEmployerJobLifecycleStatus, getJobStatusLabel } from "@/lib/job-listing-billing"

const baseJob = {
  isActive: false,
  paymentStatus: "paid" as const,
  activatedAt: null,
  expiresAt: null
}

describe("employer job lifecycle status", () => {
  test("treats unpublished paid jobs as drafts", () => {
    expect(getEmployerJobLifecycleStatus(baseJob)).toBe("draft")
    expect(getJobStatusLabel(baseJob)).toBe("Draft")
  })

  test("treats active paid jobs as live", () => {
    const liveJob = {
      ...baseJob,
      isActive: true,
      activatedAt: new Date("2026-03-10T12:00:00.000Z"),
      expiresAt: new Date("2026-04-09T12:00:00.000Z")
    }

    expect(getEmployerJobLifecycleStatus(liveJob)).toBe("live")
    expect(getJobStatusLabel(liveJob)).toBe("Live")
  })

  test("treats previously published inactive jobs as closed", () => {
    const closedJob = {
      ...baseJob,
      activatedAt: new Date("2026-03-10T12:00:00.000Z"),
      expiresAt: new Date("2026-04-09T12:00:00.000Z")
    }

    expect(getEmployerJobLifecycleStatus(closedJob)).toBe("closed")
    expect(getJobStatusLabel(closedJob)).toBe("Closed")
  })

  test("treats elapsed paid jobs as expired", () => {
    const expiredJob = {
      ...baseJob,
      isActive: true,
      activatedAt: new Date("2026-01-01T12:00:00.000Z"),
      expiresAt: new Date("2026-02-01T12:00:00.000Z")
    }

    expect(getEmployerJobLifecycleStatus(expiredJob, new Date("2026-03-12T12:00:00.000Z"))).toBe("expired")
    expect(getJobStatusLabel(expiredJob, new Date("2026-03-12T12:00:00.000Z"))).toBe("Expired")
  })
})
