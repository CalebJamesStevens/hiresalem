import { hasAnyRole, normalizeRoles, type AppRole } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"
import { redirect } from "next/navigation"

export type SessionUser = {
  id: string
  roles: AppRole[]
}

export async function requirePageRoles(requiredRoles: AppRole[], callbackPath: string): Promise<SessionUser> {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)

  if (!userId) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`)
  }

  if (!hasAnyRole(roles, requiredRoles)) {
    redirect("/jobs")
  }

  return { id: userId, roles }
}
