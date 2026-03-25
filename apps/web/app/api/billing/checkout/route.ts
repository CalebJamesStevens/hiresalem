import { getCompanyByOwnerAuthId } from "@/lib/companies"
import {
  attachCompanyStripeCustomer,
  getCompanyPlanIdFromStripeSubscription,
  getStripePriceIdForCompanyPlan,
  isBillableCompanyPlanId,
  syncCompanyBillingFromStripeSubscription
} from "@/lib/company-billing"
import { requireApiRoles } from "@/lib/api-auth"
import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import type Stripe from "stripe"

function buildDashboardPlanRedirect(requestUrl: string, params: Record<string, string>) {
  const url = new URL("/dashboard/plan", requestUrl)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  url.hash = "pricing"
  return url
}

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as Record<string, unknown>
    return {
      planId: typeof payload.planId === "string" ? payload.planId : "",
      confirmChange: payload.confirmChange === true || payload.confirmChange === "true",
      prefersJson: true
    }
  }

  const formData = await request.formData()
  return {
    planId: typeof formData.get("planId") === "string" ? String(formData.get("planId")) : "",
    confirmChange: formData.get("confirmChange") === "true",
    prefersJson: false
  }
}

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin
}

async function findExistingManagedSubscription(stripe: Stripe, stripeCustomerId: string, subscriptionId?: string | null) {
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"]
      })

      if (subscription.status !== "canceled" && subscription.status !== "incomplete_expired") {
        return subscription
      }
    } catch {
      // Fall back to customer-wide lookup if the stored subscription is stale.
    }
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"]
  })

  return subscriptions.data.find((subscription) => subscription.status !== "canceled" && subscription.status !== "incomplete_expired") ?? null
}

export async function POST(request: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const input = await readInput(request)

  if (!isBillableCompanyPlanId(input.planId)) {
    if (input.prefersJson) {
      return Response.json({ error: "invalid_plan" }, { status: 400 })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "invalid_plan" }), 303)
  }

  const priceId = getStripePriceIdForCompanyPlan(input.planId)

  if (!priceId) {
    if (input.prefersJson) {
      return Response.json({ error: "billing_unavailable" }, { status: 503 })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "billing_unavailable" }), 303)
  }

  const company = await getCompanyByOwnerAuthId(authResult.user.id)

  if (!company) {
    if (input.prefersJson) {
      return Response.json({ error: "company_not_found" }, { status: 400 })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "company_not_found" }), 303)
  }

  let stripe

  try {
    stripe = getStripe()
  } catch {
    if (input.prefersJson) {
      return Response.json({ error: "billing_unavailable" }, { status: 503 })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "billing_unavailable" }), 303)
  }

  let stripeCustomerId = company.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: authResult.user.email ?? undefined,
      name: company.name,
      metadata: {
        companyId: company.id,
        ownerAuthId: company.ownerAuthId
      }
    })

    stripeCustomerId = customer.id
    await attachCompanyStripeCustomer({
      companyId: company.id,
      stripeCustomerId
    })
  }

  const existingSubscription = stripeCustomerId ? await findExistingManagedSubscription(stripe, stripeCustomerId, company.stripeSubscriptionId) : null

  if (existingSubscription) {
    const currentPlanId = getCompanyPlanIdFromStripeSubscription(existingSubscription)

    if (currentPlanId === input.planId && !existingSubscription.cancel_at_period_end) {
      await syncCompanyBillingFromStripeSubscription(existingSubscription)

      if (input.prefersJson) {
        return Response.json({ updated: true })
      }

      return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billing: "updated" }), 303)
    }

    if (!input.confirmChange) {
      if (input.prefersJson) {
        return Response.json({ error: "confirm_required" }, { status: 409 })
      }

      return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "confirm_required", confirmPlan: input.planId }), 303)
    }

    const subscriptionItem = existingSubscription.items.data[0]

    if (!subscriptionItem) {
      if (input.prefersJson) {
        return Response.json({ error: "billing_unavailable" }, { status: 503 })
      }

      return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "billing_unavailable" }), 303)
    }

    const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
      cancel_at_period_end: false,
      metadata: {
        ...existingSubscription.metadata,
        companyId: company.id,
        planId: input.planId
      },
      items: [
        {
          id: subscriptionItem.id,
          price: priceId,
          quantity: subscriptionItem.quantity ?? 1
        }
      ],
      proration_behavior: "create_prorations"
    })

    await syncCompanyBillingFromStripeSubscription(updatedSubscription)

    if (input.prefersJson) {
      return Response.json({ updated: true })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billing: "updated" }), 303)
  }

  const appUrl = getAppUrl(request)
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    client_reference_id: company.id,
    success_url: `${appUrl}/dashboard/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/plan?checkout=canceled`,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    metadata: {
      companyId: company.id,
      planId: input.planId
    },
    subscription_data: {
      metadata: {
        companyId: company.id,
        planId: input.planId
      }
    }
  })

  if (!session.url) {
    if (input.prefersJson) {
      return Response.json({ error: "billing_unavailable" }, { status: 503 })
    }

    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "billing_unavailable" }), 303)
  }

  if (input.prefersJson) {
    return Response.json({ url: session.url })
  }

  return NextResponse.redirect(session.url, 303)
}
