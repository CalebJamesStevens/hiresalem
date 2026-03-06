import { hasAnyRole, normalizeRoles, type AppRole } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"

export type ApiAuthUser = {
  id: string
  roles: AppRole[]
}

export async function requireApiRoles(requiredRoles: AppRole[]) {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)

  if (!userId) {
    return { response: Response.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  if (!hasAnyRole(roles, requiredRoles)) {
    return { response: Response.json({ error: "Forbidden" }, { status: 403 }) }
  }

  return { user: { id: userId, roles } satisfies ApiAuthUser }
}
