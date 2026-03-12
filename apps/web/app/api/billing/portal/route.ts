import { getCompanyByOwnerAuthId } from "@/lib/companies"
import { hasManagedBillingSubscription } from "@/lib/company-billing"
import { requireApiRoles } from "@/lib/api-auth"
import { getStripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

function buildDashboardPlanRedirect(requestUrl: string, params: Record<string, string>) {
  const url = new URL("/dashboard/plan", requestUrl)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url
}

function getAppUrl(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin
}

export async function POST(request: Request) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const company = await getCompanyByOwnerAuthId(authResult.user.id)

  if (!company) {
    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "company_not_found" }), 303)
  }

  if (!company.stripeCustomerId || !hasManagedBillingSubscription(company)) {
    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "subscription_required" }), 303)
  }

  let stripe

  try {
    stripe = getStripe()
  } catch {
    return NextResponse.redirect(buildDashboardPlanRedirect(request.url, { billingError: "billing_unavailable" }), 303)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${getAppUrl(request)}/dashboard/plan?billing=returned`
  })

  return NextResponse.redirect(session.url, 303)
}
