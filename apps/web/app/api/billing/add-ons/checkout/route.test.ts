import { beforeEach, describe, expect, mock, test } from "bun:test"

const requireApiRolesMock = mock(async () => ({
  user: {
    id: "owner-1",
    email: "owner@example.com",
    roles: ["business"]
  }
}))

const attachCompanyStripeCustomerMock = mock(async () => null)
const getCompanyForEmployerAddOnCheckoutMock = mock(async () => ({
  id: "company-1",
  name: "Willamette Works",
  ownerAuthId: "owner-1",
  stripeCustomerId: null,
  plan: "free" as const,
  planOverride: null
}))
const getJobForEmployerAddOnCheckoutMock = mock(async () => ({
  id: "job-1",
  title: "Operations Manager",
  slug: "operations-manager",
  companyId: "company-1",
  ownerAuthId: "owner-1",
  isActive: true,
  isFeatured: false,
  paymentStatus: "paid" as const,
  featuredExpiresAt: null,
  expiresAt: null
}))
const createPendingEmployerAddOnPurchaseMock = mock(async () => null)
const hasQueuedSocialShoutoutPurchaseMock = mock(async () => false)
const hasPendingOrActiveWeeklyFeaturePurchaseMock = mock(async () => false)
const hasActiveFeaturedAddOnMock = mock(() => false)
const stripeCustomersCreateMock = mock(async () => ({ id: "cus_123" }))
const stripeCheckoutCreateMock = mock(async () => ({
  id: "cs_test_123",
  url: "https://checkout.stripe.test/session"
}))

mock.module("@/lib/api-auth", () => ({
  requireApiRoles: requireApiRolesMock
}))

mock.module("@/lib/authz", () => ({
  hasRole: (roles: string[], role: string) => roles.includes(role)
}))

mock.module("@/lib/company-billing", () => ({
  attachCompanyStripeCustomer: attachCompanyStripeCustomerMock
}))

mock.module("@/lib/employer-add-ons", () => ({
  createPendingEmployerAddOnPurchase: createPendingEmployerAddOnPurchaseMock,
  getCompanyForEmployerAddOnCheckout: getCompanyForEmployerAddOnCheckoutMock,
  getEmployerAddOnDefinition: (addOnId: string) => {
    const definitions = {
      extra_slot: {
        id: "extra_slot",
        dashboardHref: "/dashboard/plan#add-ons",
        requiresJob: false
      },
      weekly_feature: {
        id: "weekly_feature",
        dashboardHref: "/dashboard/jobs",
        requiresJob: true
      },
      social_shoutout: {
        id: "social_shoutout",
        dashboardHref: "/dashboard/jobs",
        requiresJob: true
      }
    } as const

    return definitions[addOnId as keyof typeof definitions]
  },
  getJobForEmployerAddOnCheckout: getJobForEmployerAddOnCheckoutMock,
  getStripePriceIdForEmployerAddOn: () => "price_123",
  hasActiveFeaturedAddOn: hasActiveFeaturedAddOnMock,
  hasPendingOrActiveWeeklyFeaturePurchase: hasPendingOrActiveWeeklyFeaturePurchaseMock,
  hasQueuedSocialShoutoutPurchase: hasQueuedSocialShoutoutPurchaseMock,
  isEmployerAddOnId: (value: unknown) => typeof value === "string" && ["extra_slot", "weekly_feature", "social_shoutout"].includes(value)
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
    }
  })
}))

describe("POST /api/billing/add-ons/checkout", () => {
  beforeEach(() => {
    requireApiRolesMock.mockClear()
    attachCompanyStripeCustomerMock.mockClear()
    getCompanyForEmployerAddOnCheckoutMock.mockClear()
    getJobForEmployerAddOnCheckoutMock.mockClear()
    createPendingEmployerAddOnPurchaseMock.mockClear()
    hasQueuedSocialShoutoutPurchaseMock.mockClear()
    hasPendingOrActiveWeeklyFeaturePurchaseMock.mockClear()
    hasActiveFeaturedAddOnMock.mockClear()
    stripeCustomersCreateMock.mockClear()
    stripeCheckoutCreateMock.mockClear()
  })

  test("blocks Extra Slot checkout for unlimited plans", async () => {
    getCompanyForEmployerAddOnCheckoutMock.mockResolvedValueOnce({
      id: "company-1",
      name: "Willamette Works",
      ownerAuthId: "owner-1",
      stripeCustomerId: "cus_123",
      plan: "standard" as const,
      planOverride: null
    })

    const { POST } = await import("@/app/api/billing/add-ons/checkout/route")
    const response = await POST(
      new Request("http://localhost:3000/api/billing/add-ons/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          addOnId: "extra_slot"
        })
      })
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "http://localhost:3000")
    expect(location.pathname).toBe("/dashboard/plan")
    expect(location.searchParams.get("addOnError")).toBe("plan_not_eligible")
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  test("blocks Social Shoutout checkout when one is already queued", async () => {
    hasQueuedSocialShoutoutPurchaseMock.mockResolvedValueOnce(true)

    const { POST } = await import("@/app/api/billing/add-ons/checkout/route")
    const response = await POST(
      new Request("http://localhost:3000/api/billing/add-ons/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          addOnId: "social_shoutout",
          jobId: "job-1"
        })
      })
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "http://localhost:3000")
    expect(location.pathname).toBe("/dashboard/jobs")
    expect(location.searchParams.get("addOnError")).toBe("social_shoutout_already_queued")
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  test("blocks Weekly Feature checkout when one is already pending", async () => {
    hasPendingOrActiveWeeklyFeaturePurchaseMock.mockResolvedValueOnce(true)

    const { POST } = await import("@/app/api/billing/add-ons/checkout/route")
    const response = await POST(
      new Request("http://localhost:3000/api/billing/add-ons/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          addOnId: "weekly_feature",
          jobId: "job-1"
        })
      })
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "http://localhost:3000")
    expect(location.pathname).toBe("/dashboard/jobs")
    expect(location.searchParams.get("addOnError")).toBe("featured_already_active")
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  test("blocks Weekly Feature checkout for Partner jobs even when the stored featured flag is false", async () => {
    getCompanyForEmployerAddOnCheckoutMock.mockResolvedValueOnce({
      id: "company-1",
      name: "Willamette Works",
      ownerAuthId: "owner-1",
      stripeCustomerId: "cus_123",
      plan: "partner" as const,
      planOverride: null
    })

    const { POST } = await import("@/app/api/billing/add-ons/checkout/route")
    const response = await POST(
      new Request("http://localhost:3000/api/billing/add-ons/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          addOnId: "weekly_feature",
          jobId: "job-1"
        })
      })
    )

    expect(response.status).toBe(303)
    const location = new URL(response.headers.get("location") ?? "http://localhost:3000")
    expect(location.pathname).toBe("/dashboard/jobs")
    expect(location.searchParams.get("addOnError")).toBe("featured_already_active")
    expect(stripeCheckoutCreateMock).not.toHaveBeenCalled()
  })

  test("creates a checkout session for a valid Extra Slot purchase", async () => {
    const { POST } = await import("@/app/api/billing/add-ons/checkout/route")
    const response = await POST(
      new Request("http://localhost:3000/api/billing/add-ons/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          addOnId: "extra_slot"
        })
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.test/session"
    })
    expect(stripeCustomersCreateMock).toHaveBeenCalledTimes(1)
    expect(attachCompanyStripeCustomerMock).toHaveBeenCalledWith({
      companyId: "company-1",
      stripeCustomerId: "cus_123"
    })
    expect(createPendingEmployerAddOnPurchaseMock).toHaveBeenCalledWith({
      companyId: "company-1",
      ownerAuthId: "owner-1",
      type: "extra_slot",
      jobId: null,
      stripeCheckoutSessionId: "cs_test_123"
    })
    expect(stripeCheckoutCreateMock).toHaveBeenCalledTimes(1)
    const [payload] = stripeCheckoutCreateMock.mock.calls[0] ?? []
    expect(payload?.success_url).toBe(
      "http://localhost:3000/dashboard/plan?addOn=success&addOnType=extra_slot&session_id={CHECKOUT_SESSION_ID}#add-ons"
    )
    expect(payload?.cancel_url).toBe("http://localhost:3000/dashboard/plan?addOn=canceled&addOnType=extra_slot#add-ons")
  })
})
