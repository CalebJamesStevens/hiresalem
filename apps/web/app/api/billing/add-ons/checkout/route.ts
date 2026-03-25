import { attachCompanyStripeCustomer } from "@/lib/company-billing"
import {
  createPendingEmployerAddOnPurchase,
  getCompanyForEmployerAddOnCheckout,
  getEmployerAddOnDefinition,
  getJobForEmployerAddOnCheckout,
  getStripePriceIdForEmployerAddOn,
  hasActiveFeaturedAddOn,
  hasPendingOrActiveWeeklyFeaturePurchase,
  hasQueuedSocialShoutoutPurchase,
  isEmployerAddOnId
} from "@/lib/employer-add-ons"
import { requireApiRoles } from "@/lib/api-auth"
import { isJobPublished } from "@/lib/job-listing-billing"
import { hasRole } from "@/lib/authz"
import { getStripe } from "@/lib/stripe"
import { resolveCompanyPlan } from "@repo/db/plans"
import { NextResponse } from "next/server"

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin
}

function buildRedirectUrl(requestUrl: string, path: string, params: Record<string, string>) {
  const url = new URL(path, requestUrl)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url
}

function buildAppUrl(appUrl: string, path: string, params: Record<string, string>) {
  const url = new URL(path, appUrl)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url.toString().replace(encodeURIComponent("{CHECKOUT_SESSION_ID}"), "{CHECKOUT_SESSION_ID}")
}

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as Record<string, unknown>

    return {
      addOnId: typeof payload.addOnId === "string" ? payload.addOnId : "",
      jobId: typeof payload.jobId === "string" ? payload.jobId : null,
      prefersJson: true
    }
  }

  const formData = await request.formData()

  return {
    addOnId: typeof formData.get("addOnId") === "string" ? String(formData.get("addOnId")) : "",
    jobId: typeof formData.get("jobId") === "string" ? String(formData.get("jobId")) : null,
    prefersJson: false
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const input = await readInput(request)

  if (!isEmployerAddOnId(input.addOnId)) {
    return NextResponse.redirect(buildRedirectUrl(request.url, "/dashboard/plan", { addOnError: "invalid_add_on" }), 303)
  }

  const definition = getEmployerAddOnDefinition(input.addOnId)
  const company = await getCompanyForEmployerAddOnCheckout(authResult.user.id)

  if (!company) {
    return NextResponse.redirect(buildRedirectUrl(request.url, "/dashboard/plan", { addOnError: "company_not_found" }), 303)
  }

  const companyPlan = resolveCompanyPlan(company)
  const isAdmin = hasRole(authResult.user.roles, "admin")

  if (definition.requiresJob && !input.jobId) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "job_required" }), 303)
  }

  const job = definition.requiresJob && input.jobId ? await getJobForEmployerAddOnCheckout(input.jobId, authResult.user.id, isAdmin) : null

  if (definition.requiresJob && !job) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "job_not_found" }), 303)
  }

  if (job && job.companyId !== company.id) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "job_not_found" }), 303)
  }

  if (job && !isJobPublished(job)) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "job_must_be_live" }), 303)
  }

  if (input.addOnId === "extra_slot" && companyPlan.entitlements.maxActiveJobs === null) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "plan_not_eligible" }), 303)
  }

  if (input.addOnId === "weekly_feature" && job) {
    const alreadyFeaturedByPlan = companyPlan.entitlements.maxFeaturedJobs === null || (companyPlan.entitlements.allowsFeaturedJobs && job.isFeatured)

    if (alreadyFeaturedByPlan || hasActiveFeaturedAddOn(job) || (await hasPendingOrActiveWeeklyFeaturePurchase(job.id))) {
      return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "featured_already_active" }), 303)
    }
  }

  if (input.addOnId === "social_shoutout" && job && (await hasQueuedSocialShoutoutPurchase(job.id))) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "social_shoutout_already_queued" }), 303)
  }

  const priceId = getStripePriceIdForEmployerAddOn(input.addOnId)
  if (!priceId) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "billing_unavailable" }), 303)
  }

  let stripe

  try {
    stripe = getStripe()
  } catch {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "billing_unavailable" }), 303)
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

  const appUrl = getAppUrl(request)
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId,
    success_url: buildAppUrl(appUrl, definition.dashboardHref, {
      addOn: "success",
      addOnType: input.addOnId,
      session_id: "{CHECKOUT_SESSION_ID}"
    }),
    cancel_url: buildAppUrl(appUrl, definition.dashboardHref, {
      addOn: "canceled",
      addOnType: input.addOnId
    }),
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    metadata: {
      companyId: company.id,
      ownerAuthId: authResult.user.id,
      addOnType: input.addOnId,
      jobId: job?.id ?? ""
    }
  })

  if (!session.url) {
    return NextResponse.redirect(buildRedirectUrl(request.url, definition.dashboardHref, { addOnError: "billing_unavailable" }), 303)
  }

  await createPendingEmployerAddOnPurchase({
    companyId: company.id,
    ownerAuthId: authResult.user.id,
    type: input.addOnId,
    jobId: job?.id ?? null,
    stripeCheckoutSessionId: session.id
  })

  if (input.prefersJson) {
    return Response.json({ url: session.url })
  }

  return NextResponse.redirect(session.url, 303)
}
