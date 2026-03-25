import { beforeEach, describe, expect, mock, test } from "bun:test"

const selectLimitMock = mock(async () => [])
const selectWhereMock = mock(() => ({
  limit: selectLimitMock
}))
const selectFromMock = mock(() => ({
  where: selectWhereMock
}))
const selectMock = mock(() => ({
  from: selectFromMock
}))

const updateReturningMock = mock(async () => [])
const updateWhereMock = mock(() => ({
  returning: updateReturningMock
}))
const updateSetMock = mock(() => ({
  where: updateWhereMock
}))
const updateMock = mock(() => ({
  set: updateSetMock
}))

const sendEmailMock = mock(async () => null)

mock.module("@/lib/db", () => ({
  db: {
    select: selectMock,
    update: updateMock
  }
}))

mock.module("@/lib/companies", () => ({
  getCompanyById: mock(async () => ({
    id: "company-1",
    name: "Willamette Works"
  })),
  getCompanyByOwnerAuthId: mock(async () => null)
}))

mock.module("@/lib/email", () => ({
  sendEmail: sendEmailMock
}))

mock.module("@/lib/stripe", () => ({
  getStripe: () => {
    throw new Error("not used in test")
  }
}))

describe("syncEmployerAddOnFromCheckoutSession", () => {
  beforeEach(() => {
    selectMock.mockClear()
    selectFromMock.mockClear()
    selectWhereMock.mockClear()
    selectLimitMock.mockClear()
    updateMock.mockClear()
    updateSetMock.mockClear()
    updateWhereMock.mockClear()
    updateReturningMock.mockClear()
    sendEmailMock.mockClear()
  })

  test("does not re-notify an already recorded social shoutout purchase", async () => {
    selectLimitMock.mockResolvedValueOnce([
      {
        id: "purchase-1",
        companyId: "company-1",
        jobId: "job-1",
        type: "social_shoutout",
        status: "paid",
        note: "social_queue_recorded",
        paidAt: new Date("2026-03-20T18:00:00.000Z"),
        fulfilledAt: null,
        expiresAt: null
      }
    ])

    const { syncEmployerAddOnFromCheckoutSession } = await import("@/lib/employer-add-ons")
    const result = await syncEmployerAddOnFromCheckoutSession({
      id: "cs_test_123",
      metadata: {
        addOnType: "social_shoutout"
      }
    } as never)

    expect(result).toMatchObject({
      id: "purchase-1",
      status: "paid",
      note: "social_queue_recorded"
    })
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })
})
