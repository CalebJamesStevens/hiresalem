import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { deleteSavedSearch, updateSavedSearch } from "@/lib/saved-searches"

const paramsSchema = z.object({
  id: z.string().uuid()
})

const updateSavedSearchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  alertsEnabled: z.boolean().optional()
})

type SavedSearchRouteProps = {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_: Request, { params }: SavedSearchRouteProps) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const parsed = paramsSchema.safeParse(await params)
  if (!parsed.success) {
    return Response.json({ error: "Invalid saved search id" }, { status: 400 })
  }

  const deleted = await deleteSavedSearch({
    id: parsed.data.id,
    userAuthId: authResult.user.id
  })

  if (!deleted) {
    return Response.json({ error: "Saved search not found" }, { status: 404 })
  }

  return Response.json({ ok: true })
}

export async function PATCH(req: Request, { params }: SavedSearchRouteProps) {
  const authResult = await requireApiRoles(["user", "business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const [parsedParams, parsedBody] = await Promise.all([paramsSchema.safeParseAsync(await params), updateSavedSearchSchema.safeParseAsync(await req.json())])
  if (!parsedParams.success) {
    return Response.json({ error: "Invalid saved search id" }, { status: 400 })
  }

  if (!parsedBody.success) {
    return Response.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const updated = await updateSavedSearch({
    id: parsedParams.data.id,
    userAuthId: authResult.user.id,
    name: parsedBody.data.name,
    recipientEmail: parsedBody.data.recipientEmail === "" ? authResult.user.email : parsedBody.data.recipientEmail,
    alertsEnabled: parsedBody.data.alertsEnabled
  }).catch((error) => {
    return error
  })

  if (updated instanceof Error) {
    return Response.json({ error: updated.message }, { status: 400 })
  }

  if (!updated) {
    return Response.json({ error: "Saved search not found" }, { status: 404 })
  }

  return Response.json(updated)
}
