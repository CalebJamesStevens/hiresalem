import { describe, expect, mock, test } from "bun:test"

const existingJob = {
  id: "job-1",
  slug: "legacy-job",
  listingDurationDays: 30,
  activatedAt: null,
  expiresAt: null,
  stripePaymentIntentId: null,
  isActive: false,
  paymentStatus: "pending" as const,
  companyId: null,
  description: null,
  workMode: "onsite" as const,
  jobLocationCity: null,
  jobLocationRegion: null,
  jobLocationCountry: null
}

const updatedJob = {
  ...existingJob,
  isActive: true,
  paymentStatus: "paid" as const,
  activatedAt: new Date("2026-03-11T12:00:00.000Z"),
  expiresAt: new Date("2026-04-10T12:00:00.000Z"),
  stripeCheckoutSessionId: "cs_test_123",
  stripePaymentIntentId: "pi_123"
}

const selectLimitMock = mock(async () => [existingJob])
const selectWhereMock = mock(() => ({
  limit: selectLimitMock
}))
const selectFromMock = mock(() => ({
  where: selectWhereMock
}))
const selectMock = mock(() => ({
  from: selectFromMock
}))

const updateReturningMock = mock(async () => [updatedJob])
const updateWhereMock = mock(() => ({
  returning: updateReturningMock
}))
const updateSetMock = mock(() => ({
  where: updateWhereMock
}))
const updateMock = mock(() => ({
  set: updateSetMock
}))

mock.module("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock
  }
}))

describe("activatePaidJobListing", () => {
  test("activates an already-paid legacy pending job without publication validation", async () => {
    const { activatePaidJobListing } = await import("@/lib/job-billing")

    const result = await activatePaidJobListing({
      jobId: existingJob.id,
      stripeCheckoutSessionId: "cs_test_123",
      stripePaymentIntentId: "pi_123"
    })

    expect(result).toEqual(updatedJob)
    expect(updateSetMock).toHaveBeenCalledTimes(1)
    const [updatePayload] = updateSetMock.mock.calls[0] ?? []
    expect(updatePayload?.isActive).toBe(true)
    expect(updatePayload?.paymentStatus).toBe("paid")
    expect(updatePayload?.stripeCheckoutSessionId).toBe("cs_test_123")
    expect(updatePayload?.stripePaymentIntentId).toBe("pi_123")
    expect(updatePayload?.activatedAt).toBeInstanceOf(Date)
    expect(updatePayload?.expiresAt).toBeInstanceOf(Date)
    expect(updatePayload?.expiresAt.getTime() - updatePayload?.activatedAt.getTime()).toBe(30 * 24 * 60 * 60 * 1000)
  })
})
