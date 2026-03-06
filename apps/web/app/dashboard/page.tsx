import { redirect } from "next/navigation"

import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"

export default async function DashboardIndexPage() {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)

  if (!userId) {
    redirect("/signin?callbackUrl=/dashboard")
  }

  if (hasAnyRole(roles, ["business", "admin"])) {
    redirect("/dashboard/jobs")
  }

  if (hasAnyRole(roles, ["user", "admin"])) {
    redirect("/dashboard/applications")
  }

  redirect("/jobs")
}
