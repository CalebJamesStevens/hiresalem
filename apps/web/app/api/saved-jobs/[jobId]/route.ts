import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { deleteSavedJob, updateSavedJobAlerts } from "@/lib/saved-jobs"

const updateSavedJobSchema = z.object({
  alertsEnabled: z.boolean()
})

type SavedJobRouteContext = {
  params: Promise<{
    jobId: string
  }>
}

export async function DELETE(_request: Request, { params }: SavedJobRouteContext) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { jobId } = await params
  const deleted = await deleteSavedJob({
    userAuthId: authResult.user.id,
    jobId
  })

  if (!deleted) {
    return Response.json({ error: "Saved job not found" }, { status: 404 })
  }

  return Response.json({ ok: true })
}

export async function PATCH(request: Request, { params }: SavedJobRouteContext) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const parsed = updateSavedJobSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const { jobId } = await params
  const updated = await updateSavedJobAlerts({
    userAuthId: authResult.user.id,
    jobId,
    alertsEnabled: parsed.data.alertsEnabled,
    recipientEmail: authResult.user.email
  })

  if (!updated) {
    return Response.json({ error: "Saved job not found" }, { status: 404 })
  }

  return Response.json(updated)
}
