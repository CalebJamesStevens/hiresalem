import Link from "next/link"

import { hasAnyRole, normalizeRoles } from "@/lib/authz"
import { getSessionSafe } from "@/lib/session"
import { SUPPORT_EMAIL, SUPPORT_EMAIL_HREF } from "@/lib/support"

type DashboardLink = {
  href: string
  label: string
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const canManageJobs = hasAnyRole(roles, ["business", "admin"])
  const canViewApplications = hasAnyRole(roles, ["user", "admin"])
  const employerLinks: DashboardLink[] = canManageJobs
    ? [
        { href: "/dashboard/jobs", label: "My Jobs" },
        { href: "/dashboard/applicants", label: "Applicants" },
        { href: "/dashboard/analytics", label: "Analytics" },
        { href: "/dashboard/plan", label: "Plan & Billing" },
        { href: "/dashboard/company", label: "Company Profile" },
      ]
    : []
  const jobSeekerLinks: DashboardLink[] = [
    ...(canViewApplications ? [{ href: "/dashboard/applications", label: "My Applications" }] : []),
    ...(userId ? [{ href: "/dashboard/saved-jobs", label: "Saved Jobs" }] : []),
    ...(userId ? [{ href: "/dashboard/saved-searches", label: "Saved Searches" }] : []),
  ]

  return (
    <div className="space-y-6">
      <nav className="space-y-4 text-sm">
        {employerLinks.length ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Employer</p>
            <div className="flex flex-wrap gap-3">
              {employerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded border bg-white px-3 py-2">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        {jobSeekerLinks.length ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Job Seeker</p>
            <div className="flex flex-wrap gap-3">
              {jobSeekerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="rounded border bg-white px-3 py-2">
                  {link.label}
                </Link>
              ))}
              {!canManageJobs ? (
                <Link href="/become-business" className="rounded border bg-white px-3 py-2">
                  Become a Business
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <a href={SUPPORT_EMAIL_HREF} className="rounded border bg-white px-3 py-2 text-slate-700 hover:text-slate-900">
            Support
          </a>
        </div>
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
