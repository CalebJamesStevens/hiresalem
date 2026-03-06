import Link from "next/link"
import { notFound } from "next/navigation"

import { ApplicationForm } from "@/components/application-form"
import { hasAnyRole, hasRole, normalizeRoles } from "@/lib/authz"
import { getJobBySlug } from "@/lib/jobs"
import { getSessionSafe } from "@/lib/session"

type JobPageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = "force-dynamic"

export default async function JobPage({ params }: JobPageProps) {
  const { slug } = await params
  const session = await getSessionSafe()
  const userId = session?.user?.id
  const roles = normalizeRoles(session?.user?.roles)
  const isAdmin = hasRole(roles, "admin")

  const job = await getJobBySlug(slug)

  if (!job) {
    notFound()
  }

  const canViewInactive = Boolean(userId && (isAdmin || job.ownerAuthId === userId))
  if (!job.isActive && !canViewInactive) {
    notFound()
  }

  const canApplyInApp = job.applyType === "onsite" && job.isActive && hasAnyRole(roles, ["user", "admin"])
  const signedInName = typeof session?.user?.name === "string" ? session.user.name : null
  const signedInEmail = typeof session?.user?.email === "string" ? session.user.email : null

  return (
    <article className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.applyType === "onsite" ? "Apply in app" : "External apply"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">{job.isActive ? "Open role" : "Closed role"}</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{job.title}</h1>
            <p className="text-base text-slate-600">{job.location ?? "Salem, OR"}</p>
          </div>
          {!job.isActive ? (
            <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This role is currently closed.
            </p>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-slate-900">About the role</h2>
              <p className="whitespace-pre-wrap text-slate-700">{job.description ?? "No description provided yet."}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">What to expect</h2>
              <p className="text-sm text-slate-300">
                Strong applications usually include a resume or profile link plus a short note that ties your experience to the role.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {job.applyType === "external" ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Apply through the employer</h2>
              <p className="mt-2 text-sm text-slate-600">
                This job uses an external application flow. We&apos;ll send you directly to the company site.
              </p>
              <div className="mt-5">
                {job.applyUrl ? (
                  <Link
                    href={job.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    Apply on company site
                  </Link>
                ) : (
                  <p className="text-sm text-slate-600">External apply link not available.</p>
                )}
              </div>
            </div>
          ) : null}

          {job.applyType === "onsite" && !job.isActive ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              This position is closed and no longer accepting applications.
            </div>
          ) : null}

          {job.applyType === "onsite" && job.isActive && !userId ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <Link className="font-medium underline" href={`/signin?callbackUrl=${encodeURIComponent(`/jobs/${job.slug}`)}`}>
                Sign in
              </Link>{" "}
              with a user account to apply and keep track of your applications.
            </div>
          ) : null}

          {job.applyType === "onsite" && job.isActive && userId && !canApplyInApp ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Your account role cannot submit applications.
            </div>
          ) : null}

          {canApplyInApp ? (
            <ApplicationForm
              jobId={job.id}
              jobTitle={job.title}
              jobLocation={job.location}
              defaultName={signedInName}
              defaultEmail={signedInEmail}
            />
          ) : null}
        </div>
      </div>
    </article>
  )
}
