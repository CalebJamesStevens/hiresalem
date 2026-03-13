import { beforeEach, describe, expect, mock, test } from "bun:test"

const rateLimitMock = mock(() => ({ ok: true }))
const requestKeyMock = mock(() => "ip:test")
const parseEmployerAnalyticsEventMock = mock(() => ({
  success: true as const,
  data: {
    companyId: "company-1",
    jobId: "job-1",
    eventType: "job_view" as const
  }
}))
const validateEmployerAnalyticsTargetMock = mock(async () => true)
const recordEmployerAnalyticsEventMock = mock(async () => ({ id: "event-1" }))

mock.module("@/lib/rate-limit", () => ({
  checkRateLimit: rateLimitMock
}))

mock.module("@/lib/request", () => ({
  getRequestKey: requestKeyMock
}))

mock.module("@/lib/employer-analytics", () => ({
  parseEmployerAnalyticsEvent: parseEmployerAnalyticsEventMock,
  validateEmployerAnalyticsTarget: validateEmployerAnalyticsTargetMock,
  recordEmployerAnalyticsEvent: recordEmployerAnalyticsEventMock
}))

describe("POST /api/employer-analytics/events", () => {
  beforeEach(() => {
    rateLimitMock.mockClear()
    requestKeyMock.mockClear()
    parseEmployerAnalyticsEventMock.mockClear()
    validateEmployerAnalyticsTargetMock.mockClear()
    recordEmployerAnalyticsEventMock.mockClear()
  })

  test("rejects invalid analytics targets", async () => {
    validateEmployerAnalyticsTargetMock.mockResolvedValueOnce(false)
    const { POST } = await import("@/app/api/employer-analytics/events/route")

    const response = await POST(
      new Request("http://localhost:3000/api/employer-analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyId: "company-1",
          jobId: "job-1",
          eventType: "job_view"
        })
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Invalid analytics target"
    })
    expect(recordEmployerAnalyticsEventMock).not.toHaveBeenCalled()
  })

  test("records valid events", async () => {
    const { POST } = await import("@/app/api/employer-analytics/events/route")

    const response = await POST(
      new Request("http://localhost:3000/api/employer-analytics/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyId: "company-1",
          jobId: "job-1",
          eventType: "job_view"
        })
      })
    )

    expect(response.status).toBe(201)
    expect(recordEmployerAnalyticsEventMock).toHaveBeenCalledWith({
      companyId: "company-1",
      jobId: "job-1",
      eventType: "job_view"
    })
  })
})
