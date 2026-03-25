import Link from "next/link"

import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/support"

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
          <Link href="/dashboard/analytics" className="rounded border bg-white px-3 py-2">
            Analytics
          </Link>
        ) : null}
        {canManageJobs ? (
          <Link href="/dashboard/plan" className="rounded border bg-white px-3 py-2">
            Plan & Billing
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
          <Link href="/dashboard/saved-jobs" className="rounded border bg-white px-3 py-2">
            Saved Jobs
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
        <a href={SUPPORT_EMAIL_HREF} className="rounded border bg-white px-3 py-2 text-slate-700 hover:text-slate-900">
          Support
        </a>
      </nav>
      <p className="text-sm text-slate-600">
        Need help with billing, profile setup, or job visibility?{" "}
        <a href={SUPPORT_EMAIL_HREF} className="font-medium text-slate-900 underline underline-offset-4">
          Email {SUPPORT_EMAIL}
        </a>
        .
      </p>
      {children}
    </div>
  )
}
