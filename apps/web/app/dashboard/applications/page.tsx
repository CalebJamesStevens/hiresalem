import Link from "next/link"
import { desc, eq } from "drizzle-orm"

import { hasRole } from "@/lib/authz"
import { db } from "@/lib/db"
import { requirePageRoles } from "@/lib/page-auth"
import { buildApplicationResumePath } from "@/lib/resume-storage"
import { applications } from "@repo/db/schema/applications"
import { jobs } from "@repo/db/schema/jobs"

export const dynamic = "force-dynamic"

function formatSubmittedAt(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(date))
}

export default async function DashboardApplicationsPage() {
  const user = await requirePageRoles(["user", "admin"], "/dashboard/applications")
  const isAdmin = hasRole(user.roles, "admin")
  const canBecomeBusiness = !isAdmin && !hasRole(user.roles, "business")

  const query = db
    .select({
      id: applications.id,
      name: applications.name,
      email: applications.email,
      phone: applications.phone,
      location: applications.location,
      resume: applications.resume,
      linkedinUrl: applications.linkedinUrl,
      portfolioUrl: applications.portfolioUrl,
      coverLetter: applications.coverLetter,
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
      jobSlug: jobs.slug
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .orderBy(desc(applications.createdAt))

  const rows = isAdmin
    ? await query
    : await db
        .select({
          id: applications.id,
          name: applications.name,
          email: applications.email,
          phone: applications.phone,
          location: applications.location,
          resume: applications.resume,
          linkedinUrl: applications.linkedinUrl,
          portfolioUrl: applications.portfolioUrl,
          coverLetter: applications.coverLetter,
          createdAt: applications.createdAt,
          jobTitle: jobs.title,
          jobSlug: jobs.slug
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .where(eq(applications.applicantAuthId, user.id))
        .orderBy(desc(applications.createdAt))

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{isAdmin ? "All applications" : "Your applications"}</h1>
      {canBecomeBusiness ? (
        <p className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Hiring instead of applying? <Link href="/become-business" className="underline">Upgrade this account to business</Link>.
        </p>
      ) : null}
      {rows.length === 0 ? <p className="text-slate-600">No applications yet.</p> : null}

      <div className="space-y-3">
        {rows.map((application) => (
          <article key={application.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">{application.jobTitle ?? "Unknown job"}</p>
              <p className="text-slate-600">Submitted {formatSubmittedAt(application.createdAt)}</p>
              <p className="text-slate-700">
                Candidate: {application.name} ({application.email})
              </p>
              {application.phone ? <p className="text-slate-700">Phone: {application.phone}</p> : null}
              {application.location ? <p className="text-slate-700">Location: {application.location}</p> : null}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-slate-700">
              {application.resume ? (
                <Link href={buildApplicationResumePath(application.id)} target="_blank" rel="noreferrer" className="underline">
                  Resume
                </Link>
              ) : null}
              {application.linkedinUrl ? (
                <Link href={application.linkedinUrl} target="_blank" rel="noreferrer" className="underline">
                  LinkedIn
                </Link>
              ) : null}
              {application.portfolioUrl ? (
                <Link href={application.portfolioUrl} target="_blank" rel="noreferrer" className="underline">
                  Portfolio
                </Link>
              ) : null}
              {application.jobSlug ? (
                <Link href={`/jobs/${application.jobSlug}`} className="underline">
                  View listing
                </Link>
              ) : null}
            </div>

            {application.coverLetter ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate note</p>
                <p className="whitespace-pre-wrap">{application.coverLetter}</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
