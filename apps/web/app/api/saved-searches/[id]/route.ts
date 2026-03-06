import { z } from "zod"

import { requireApiRoles } from "@/lib/api-auth"
import { deleteSavedSearch } from "@/lib/saved-searches"

const paramsSchema = z.object({
  id: z.string().uuid()
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
