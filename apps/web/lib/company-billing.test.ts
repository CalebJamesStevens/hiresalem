import { beforeEach, describe, expect, mock, test } from "bun:test"

const baseCompany = {
  id: "company-1",
  name: "Cherry City Staffing",
  ownerAuthId: "owner-1",
  isManaged: false,
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
const retrievePriceMock = mock(async () => {
  throw new Error("network down")
})

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

mock.module("@/lib/stripe", () => ({
  getStripe: () => ({
    prices: {
      retrieve: retrievePriceMock
    }
  })
}))

describe("company billing sync", () => {
  beforeEach(() => {
    getCompanyByIdMock.mockClear()
    updateMock.mockClear()
    updateSetMock.mockClear()
    updateWhereMock.mockClear()
    updateReturningMock.mockClear()
    retrievePriceMock.mockClear()
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
        planId: "partner"
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
    expect(payload?.plan).toBe("partner")
    expect(payload?.billingPlan).toBe("partner")
    expect(payload?.billingStatus).toBe("active")
    expect(payload?.stripeCustomerId).toBe("cus_123")
    expect(payload?.stripeSubscriptionId).toBe("sub_123")
    expect(payload?.billingCurrentPeriodEnd).toBeInstanceOf(Date)
  })

  test("drops the base plan back to free when Stripe cancels the subscription", async () => {
    getCompanyByIdMock.mockResolvedValueOnce({
      ...baseCompany,
      plan: "partner",
      billingPlan: "partner",
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
        planId: "partner"
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
    expect(payload?.billingPlan).toBe("partner")
    expect(payload?.billingStatus).toBe("canceled")
  })

  test("treats non-active billing states as free-plan access to avoid stale entitlements", async () => {
    const { getCompanyBasePlanForBillingState } = await import("@/lib/company-billing")

    expect(getCompanyBasePlanForBillingState("standard", "past_due")).toBe("free")
    expect(getCompanyBasePlanForBillingState("partner", "unpaid")).toBe("free")
  })

  test("keeps self-serve billing enabled when Stripe price lookup fails but env vars exist", async () => {
    process.env.STRIPE_STANDARD_PLAN_PRICE_ID = "price_standard"
    process.env.STRIPE_PARTNER_PLAN_PRICE_ID = "price_partner"

    const { listCompanyPlanPricing } = await import("@/lib/company-billing")
    const pricing = await listCompanyPlanPricing()

    expect(pricing.find((item) => item.id === "standard")?.isConfigured).toBe(true)
    expect(pricing.find((item) => item.id === "partner")?.isConfigured).toBe(true)
  })
})
