import { getCompanyById, getCompanyPlanValidationErrorCode, parseCompanyPlanInput, updateCompanyPlanAssignment } from "@/lib/companies"
import { requireApiRoles } from "@/lib/api-auth"
import { NextResponse } from "next/server"

type CompanyPlanRouteContext = {
  params: Promise<{
    id: string
  }>
}

function buildRedirectUrl(requestUrl: string, companyId: string, returnTo: string | null, params: Record<string, string>) {
  const fallbackPath = `/admin/businesses?companyId=${encodeURIComponent(companyId)}`
  const url = new URL(returnTo && returnTo.startsWith("/") ? returnTo : fallbackPath, requestUrl)

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
      plan: formData.get("plan"),
      planOverride: formData.get("planOverride"),
      planOverrideReason: formData.get("planOverrideReason"),
      isManaged: formData.get("isManaged")
    },
    returnTo: typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : null,
    prefersJson: false
  }
}

export async function POST(request: Request, { params }: CompanyPlanRouteContext) {
  const authResult = await requireApiRoles(["admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const company = await getCompanyById(id)

  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 })
  }

  const requestData = await readInput(request)
  const parsed = parseCompanyPlanInput(requestData.payload)

  if (!parsed.success) {
    const error = getCompanyPlanValidationErrorCode(parsed.error)

    if (requestData.prefersJson) {
      return Response.json({ error }, { status: 400 })
    }

    return NextResponse.redirect(buildRedirectUrl(request.url, id, requestData.returnTo, { error }), 303)
  }

  const updated = await updateCompanyPlanAssignment({
    id,
    ...parsed.data
  })

  if (!updated) {
    return Response.json({ error: "Company not found" }, { status: 404 })
  }

  if (requestData.prefersJson) {
    return Response.json({
      id: updated.id,
      plan: updated.plan,
      planOverride: updated.planOverride,
      planOverrideReason: updated.planOverrideReason,
      isManaged: updated.isManaged
    })
  }

  return NextResponse.redirect(buildRedirectUrl(request.url, id, requestData.returnTo, { updated: "1" }), 303)
}
