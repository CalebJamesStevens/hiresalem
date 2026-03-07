import { eq } from "drizzle-orm"

import { hasRole } from "@/lib/authz"
import { requireApiRoles } from "@/lib/api-auth"
import { db } from "@/lib/db"
import {
  buildEmployerWorkflowUpdate,
  canManageEmployerApplication,
  getEmployerApplicationOwner,
  parseEmployerWorkflowPatch
} from "@/lib/applicants"
import { applications } from "@repo/db/schema/applications"

type ApplicationRouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(req: Request, { params }: ApplicationRouteContext) {
  const authResult = await requireApiRoles(["business", "admin"])
  if ("response" in authResult) {
    return authResult.response
  }

  const { id } = await params
  const parsed = parseEmployerWorkflowPatch(await req.json())

  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 })
  }

  const existing = await getEmployerApplicationOwner(id)
  if (!existing) {
    return Response.json({ error: "Application not found" }, { status: 404 })
  }

  const viewer = {
    id: authResult.user.id,
    isAdmin: hasRole(authResult.user.roles, "admin")
  }

  if (!canManageEmployerApplication(viewer, existing.ownerAuthId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const [updated] = await db
    .update(applications)
    .set(buildEmployerWorkflowUpdate(existing.stage, parsed.data))
    .where(eq(applications.id, id))
    .returning()

  return Response.json(updated)
}
