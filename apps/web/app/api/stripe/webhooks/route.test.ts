import { beforeEach, describe, expect, mock, test } from "bun:test"

const constructEventMock = mock()
const syncCompanyBillingFromCheckoutSessionMock = mock(async () => null)
const syncCompanyBillingFromStripeSubscriptionMock = mock(async () => null)
const activatePaidJobListingMock = mock(async () => null)
const markJobPaymentCanceledBySessionIdMock = mock(async () => null)

mock.module("@/lib/stripe", () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: constructEventMock
    }
  }),
  getStripeWebhookSecret: () => "whsec_test"
}))

mock.module("@/lib/company-billing", () => ({
  syncCompanyBillingFromCheckoutSession: syncCompanyBillingFromCheckoutSessionMock,
  syncCompanyBillingFromStripeSubscription: syncCompanyBillingFromStripeSubscriptionMock
}))

mock.module("@/lib/job-billing", () => ({
  activatePaidJobListing: activatePaidJobListingMock,
  markJobPaymentCanceledBySessionId: markJobPaymentCanceledBySessionIdMock
}))

describe("POST /api/stripe/webhooks", () => {
  beforeEach(() => {
    constructEventMock.mockClear()
    syncCompanyBillingFromCheckoutSessionMock.mockClear()
    syncCompanyBillingFromStripeSubscriptionMock.mockClear()
    activatePaidJobListingMock.mockClear()
    markJobPaymentCanceledBySessionIdMock.mockClear()
  })

  test("syncs company billing when a subscription checkout completes", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          mode: "subscription",
          metadata: {
            companyId: "company-1",
            planId: "business_pro"
          }
        }
      }
    })
    const { POST } = await import("@/app/api/stripe/webhooks/route")

    const response = await POST(
      new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test"
        },
        body: "{}"
      })
    )

    expect(response.status).toBe(200)
    expect(syncCompanyBillingFromCheckoutSessionMock).toHaveBeenCalledTimes(1)
    expect(activatePaidJobListingMock).not.toHaveBeenCalled()
  })

  test("syncs plan changes from customer.subscription.updated events", async () => {
    constructEventMock.mockReturnValueOnce({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          metadata: {
            companyId: "company-1",
            planId: "enhanced_profile"
          },
          items: {
            data: []
          }
        }
      }
    })
    const { POST } = await import("@/app/api/stripe/webhooks/route")

    const response = await POST(
      new Request("http://localhost:3000/api/stripe/webhooks", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test"
        },
        body: "{}"
      })
    )

    expect(response.status).toBe(200)
    expect(syncCompanyBillingFromStripeSubscriptionMock).toHaveBeenCalledTimes(1)
  })
})
