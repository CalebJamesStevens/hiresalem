import { beforeEach, describe, expect, mock, test } from "bun:test"

const baseCompany = {
  id: "company-1",
  name: "Cherry City Staffing",
  ownerAuthId: "owner-1",
  plan: "free" as const,
  planOverride: null,
  planAssignedAt: new Date("2026-03-01T00:00:00.000Z"),
  billingPlan: null,
  billingStatus: "inactive" as const,
  billingCancelAtPeriodEnd: false,
  billingCurrentPeriodEnd: null,
  billingUpdatedAt: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null
}

const getCompanyByIdMock = mock(async () => baseCompany)

const updateReturningMock = mock(async () => [baseCompany])
const updateWhereMock = mock(() => ({
  returning: updateReturningMock
}))
const updateSetMock = mock(() => ({
  where: updateWhereMock
}))
const updateMock = mock(() => ({
  set: updateSetMock
}))

mock.module("@/lib/companies", () => ({
  getCompanyById: getCompanyByIdMock
}))

mock.module("@/lib/db", () => ({
  db: {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(async () => [])
        }))
      }))
    })),
    update: updateMock
  }
}))

describe("company billing sync", () => {
  beforeEach(() => {
    getCompanyByIdMock.mockClear()
    updateMock.mockClear()
    updateSetMock.mockClear()
    updateWhereMock.mockClear()
    updateReturningMock.mockClear()
  })

  test("activates the billed plan when Stripe marks the subscription active", async () => {
    const { syncCompanyBillingFromStripeSubscription } = await import("@/lib/company-billing")

    await syncCompanyBillingFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      cancel_at_period_end: false,
      current_period_end: 1775942400,
      metadata: {
        companyId: "company-1",
        planId: "business_pro"
      },
      items: {
        data: [
          {
            current_period_end: 1775942400
          }
        ]
      }
    } as unknown as Parameters<typeof syncCompanyBillingFromStripeSubscription>[0])

    const [payload] = updateSetMock.mock.calls[0] ?? []
    expect(payload?.plan).toBe("business_pro")
    expect(payload?.billingPlan).toBe("business_pro")
    expect(payload?.billingStatus).toBe("active")
    expect(payload?.stripeCustomerId).toBe("cus_123")
    expect(payload?.stripeSubscriptionId).toBe("sub_123")
    expect(payload?.billingCurrentPeriodEnd).toBeInstanceOf(Date)
  })

  test("drops the base plan back to free when Stripe cancels the subscription", async () => {
    getCompanyByIdMock.mockResolvedValueOnce({
      ...baseCompany,
      plan: "business_pro",
      billingPlan: "business_pro",
      billingStatus: "active",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_123"
    })
    const { syncCompanyBillingFromStripeSubscription } = await import("@/lib/company-billing")

    await syncCompanyBillingFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "canceled",
      cancel_at_period_end: false,
      current_period_end: 1775942400,
      metadata: {
        companyId: "company-1",
        planId: "business_pro"
      },
      items: {
        data: [
          {
            current_period_end: 1775942400
          }
        ]
      }
    } as unknown as Parameters<typeof syncCompanyBillingFromStripeSubscription>[0])

    const [payload] = updateSetMock.mock.calls[0] ?? []
    expect(payload?.plan).toBe("free")
    expect(payload?.billingPlan).toBe("business_pro")
    expect(payload?.billingStatus).toBe("canceled")
  })

  test("treats non-active billing states as free-plan access to avoid stale entitlements", async () => {
    const { getCompanyBasePlanForBillingState } = await import("@/lib/company-billing")

    expect(getCompanyBasePlanForBillingState("enhanced_profile", "past_due")).toBe("free")
    expect(getCompanyBasePlanForBillingState("business_pro", "unpaid")).toBe("free")
  })
})
