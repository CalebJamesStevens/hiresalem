import Link from "next/link"

import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const canManageJobs = hasAnyRole(roles, ["business", "admin"])
  const canViewApplications = hasAnyRole(roles, ["user", "admin"])

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-3 text-sm">
        {canManageJobs ? (
          <Link href="/dashboard/jobs" className="rounded border bg-white px-3 py-2">
            My Jobs
          </Link>
        ) : null}
        {canManageJobs ? (
          <Link href="/dashboard/applicants" className="rounded border bg-white px-3 py-2">
            Applicants
          </Link>
        ) : null}
        {canManageJobs ? (
          <Link href="/dashboard/plan" className="rounded border bg-white px-3 py-2">
            Plan
          </Link>
        ) : null}
        {canManageJobs ? (
          <Link href="/dashboard/company" className="rounded border bg-white px-3 py-2">
            Company Profile
          </Link>
        ) : null}
        {canViewApplications ? (
          <Link href="/dashboard/applications" className="rounded border bg-white px-3 py-2">
            My Applications
          </Link>
        ) : null}
        {userId ? (
          <Link href="/dashboard/saved-searches" className="rounded border bg-white px-3 py-2">
            Saved Searches
          </Link>
        ) : null}
        {!canManageJobs ? (
          <Link href="/become-business" className="rounded border bg-white px-3 py-2">
            Become a Business
          </Link>
        ) : null}
      </nav>
      {children}
    </div>
  )
}
