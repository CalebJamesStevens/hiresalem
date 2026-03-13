import { NextResponse } from "next/server"

import { requireApiRoles } from "@/lib/api-auth"
import { approveCompanyClaimRequest, getCompanyClaimRequestById, parseCompanyClaimReviewInput, rejectCompanyClaimRequest } from "@/lib/company-claims"
import { grantRealmRoleToUserInKeycloak } from "@/lib/keycloak"

type CompanyClaimRouteContext = {
  params: Promise<{
    id: string
  }>
}

function buildRedirectUrl(requestUrl: string, returnTo: string | null, params: Record<string, string>) {
  const url = new URL(returnTo && returnTo.startsWith("/") ? returnTo : "/admin/businesses", requestUrl)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url
}

async function readInput(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""

  if (contentType.includes("application/json")) {
    const payload = (await request.json()) as Record<string, unknown>
    return {
      payload,
      returnTo: typeof payload.returnTo === "string" ? payload.returnTo : null,
      prefersJson: true
    }
  }

  const formData = await request.formData()

  return {
    payload: {
      action: formData.get("action"),
      rejectionReason: formData.get("rejectionReason")
    },
    returnTo: typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    prefersJson: false
  }
}

function respondError(request: Request, returnTo: string | null, prefersJson: boolean, error: string, status = 400) {
  if (prefersJson) {
    return Response.json({ error }, { status })
  }

  return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, { claimError: error }), 303)
}

export async function POST(request: Request, { params }: CompanyClaimRouteContext) {
  const authResult = await requireApiRoles(["admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const requestData = await readInput(request)
  const parsed = parseCompanyClaimReviewInput(requestData.payload)

  if (!parsed.success) {
    return respondError(request, requestData.returnTo, requestData.prefersJson, "invalid_claim_action")
  }

  const claim = await getCompanyClaimRequestById(id)
  if (!claim) {
    return respondError(request, requestData.returnTo, requestData.prefersJson, "claim_not_found", 404)
  }

  try {
    if (parsed.data.action === "approve") {
      const roleResult = await grantRealmRoleToUserInKeycloak({
        userId: claim.requesterAuthId,
        roleName: "business"
      })

      if (!roleResult.ok) {
        return respondError(request, requestData.returnTo, requestData.prefersJson, roleResult.reason)
      }

      const approved = await approveCompanyClaimRequest({
        id,
        reviewerAuthId: authResult.user.id
      })

      if (requestData.prefersJson) {
        return Response.json(approved)
      }

      return NextResponse.redirect(buildRedirectUrl(request.url, requestData.returnTo, { claimUpdated: "1" }), 303)
    }

    const rejected = await rejectCompanyClaimRequest({
      id,
      reviewerAuthId: authResult.user.id,
      rejectionReason: parsed.data.rejectionReason ?? null
    })

    if (requestData.prefersJson) {
      return Response.json(rejected)
    }

    return NextResponse.redirect(buildRedirectUrl(request.url, requestData.returnTo, { claimUpdated: "1" }), 303)
  } catch (error) {
    const message = error instanceof Error ? error.message : "claim_update_failed"
    return respondError(request, requestData.returnTo, requestData.prefersJson, message)
  }
}
