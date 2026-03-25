import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "owner-1",
    email: "owner@example.com",
    roles: ["business"]
  }
}))

const getCompanyByOwnerAuthIdMock = mock(async () => ({
  id: "company-1",
  name: "Willamette Works",
  ownerAuthId: "owner-1",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  billingPlan: null,
  billingStatus: "inactive" as const
}))

const attachCompanyStripeCustomerMock = mock(async () => null)
const getStripePriceIdForCompanyPlanMock = mock((planId: string) => `price_${planId}`)
const hasManagedBillingSubscriptionMock = mock(() => false)
const syncCompanyBillingFromStripeSubscriptionMock = mock(async () => null)
const getCompanyPlanIdFromStripeSubscriptionMock = mock((subscription: { metadata?: { planId?: string } }) => subscription.metadata?.planId ?? null)

const stripeCustomersCreateMock = mock(async () => ({ id: "cus_123" }))
const stripeCheckoutCreateMock = mock(async () => ({
  id: "cs_test_123",
  url: "https://checkout.stripe.test/session"
}))
const stripeSubscriptionsRetrieveMock = mock(async () => ({
  id: "sub_standard",
  status: "active",
  cancel_at_period_end: false,
  metadata: {
    companyId: "company-1",
    planId: "standard"
  },
  items: {
    data: [
      {
        id: "si_standard",
        quantity: 1,
        price: {
          id: "price_standard"
        }
      }
    ]
  }
}))
const stripeSubscriptionsListMock = mock(async () => ({
  data: []
}))
const stripeSubscriptionsUpdateMock = mock(async () => ({
  id: "sub_standard",
  status: "active",
  cancel_at_period_end: false,
  metadata: {
    companyId: "company-1",
    planId: "partner"
  },
  items: {
    data: [
      {
        id: "si_standard",
        quantity: 1,
        price: {
          id: "price_partner"
        }
      }
    ]
  }
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/companies", () => ({
  getCompanyByOwnerAuthId: getCompanyByOwnerAuthIdMock
}))

mock.module("@/lib/company-billing", () => ({
  attachCompanyStripeCustomer: attachCompanyStripeCustomerMock,
  getCompanyPlanIdFromStripeSubscription: getCompanyPlanIdFromStripeSubscriptionMock,
  getStripePriceIdForCompanyPlan: getStripePriceIdForCompanyPlanMock,
  hasManagedBillingSubscription: hasManagedBillingSubscriptionMock,
  isBillableCompanyPlanId: (value: unknown) => value === "standard" || value === "partner",
  syncCompanyBillingFromStripeSubscription: syncCompanyBillingFromStripeSubscriptionMock
}))

mock.module("@/lib/stripe", () => ({
  getStripe: () => ({
    customers: {
      create: stripeCustomersCreateMock
    },
    checkout: {
      sessions: {
        create: stripeCheckoutCreateMock
      }
    },
    subscriptions: {
      retrieve: stripeSubscriptionsRetrieveMock,
      list: stripeSubscriptionsListMock,
      update: stripeSubscriptionsUpdateMock
    }
  })
}))

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    getCompanyByOwnerAuthIdMock.mockClear()
    attachCompanyStripeCustomerMock.mockClear()
    getStripePriceIdForCompanyPlanMock.mockClear()
    hasManagedBillingSubscriptionMock.mockClear()
    syncCompanyBillingFromStripeSubscriptionMock.mockClear()
    getCompanyPlanIdFromStripeSubscriptionMock.mockClear()
    stripeCustomersCreateMock.mockClear()
    stripeCheckoutCreateMock.mockClear()
    stripeSubscriptionsRetrieveMock.mockClear()
    stripeSubscriptionsListMock.mockClear()
    stripeSubscriptionsUpdateMock.mockClear()
  })

  test("creates a checkout session when no managed subscription exists", async () => {
    const { POST } = await import("@/app/api/billing/checkout/route")

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: "standard"
        })
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.test/session"
    })
    expect(stripeCustomersCreateMock).toHaveBeenCalledTimes(1)
    expect(stripeCheckoutCreateMock).toHaveBeenCalledTimes(1)
    expect(stripeSubscriptionsUpdateMock).not.toHaveBeenCalled()
  })

  test("switches an existing managed subscription directly instead of creating a new checkout", async () => {
    getCompanyByOwnerAuthIdMock.mockResolvedValueOnce({
      id: "company-1",
      name: "Willamette Works",
      ownerAuthId: "owner-1",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_standard",
      billingPlan: "standard" as const,
      billingStatus: "active" as const
    })
    hasManagedBillingSubscriptionMock.mockReturnValueOnce(true)

    const { POST } = await import("@/app/api/billing/checkout/route")

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          planId: "partner",
          confirmChange: "true"
        })
      })
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "http://localhost:3000")
    expect(location.pathname).toBe("/dashboard/plan")
    expect(location.searchParams.get("billing")).toBe("updated")
    expect(stripeSubscriptionsUpdateMock).toHaveBeenCalledWith(
      "sub_standard",
      expect.objectContaining({
        cancel_at_period_end: false,
        proration_behavior: "create_prorations"
      })
    )
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
    expect(syncCompanyBillingFromStripeSubscriptionMock).toHaveBeenCalledTimes(1)
  })

  test("requires confirmation before switching an existing managed subscription", async () => {
    getCompanyByOwnerAuthIdMock.mockResolvedValueOnce({
      id: "company-1",
      name: "Willamette Works",
      ownerAuthId: "owner-1",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: "sub_standard",
      billingPlan: "standard" as const,
      billingStatus: "active" as const
    })
    hasManagedBillingSubscriptionMock.mockReturnValueOnce(true)

    const { POST } = await import("@/app/api/billing/checkout/route")

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: "partner"
        })
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: "confirm_required"
    })
    expect(stripeSubscriptionsUpdateMock).not.toHaveBeenCalled()
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  test("reuses an active Stripe subscription on the customer when local billing state is stale", async () => {
    getCompanyByOwnerAuthIdMock.mockResolvedValueOnce({
      id: "company-1",
      name: "Willamette Works",
      ownerAuthId: "owner-1",
      stripeCustomerId: "cus_123",
      stripeSubscriptionId: null,
      billingPlan: null,
      billingStatus: "inactive" as const
    })
    stripeSubscriptionsListMock.mockResolvedValueOnce({
      data: [
        {
          id: "sub_standard",
          status: "active",
          cancel_at_period_end: false,
          metadata: {
            companyId: "company-1",
            planId: "standard"
          },
          items: {
            data: [
              {
                id: "si_standard",
                quantity: 1,
                price: {
                  id: "price_standard"
                }
              }
            ]
          }
        }
      ]
    })

    const { POST } = await import("@/app/api/billing/checkout/route")

    const response = await POST(
      new Request("http://localhost:3000/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          planId: "partner",
          confirmChange: true
        })
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      updated: true
    })
    expect(stripeSubscriptionsListMock).toHaveBeenCalledTimes(1)
    expect(stripeSubscriptionsUpdateMock).toHaveBeenCalledTimes(1)
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })
})
