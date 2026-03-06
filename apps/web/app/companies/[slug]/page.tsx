import Link from "next/link"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"

import { db } from "@/lib/db"
import { getCompanyBySlug } from "@/lib/companies"
import { jobs } from "@repo/db/schema/jobs"

type CompanyPageProps = {
  params: Promise<{
    slug: string
  }>
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) {
    notFound()
  }

  const companyJobs = await db.select().from(jobs).where(eq(jobs.companyId, company.id))

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{company.name}</h1>
        {company.website ? (
          <p className="text-slate-600">
            <Link href={company.website} className="underline">
              {company.website}
            </Link>
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Open roles</h2>
        {companyJobs.length === 0 ? <p className="text-slate-600">No jobs posted yet.</p> : null}
        {companyJobs.map((job) => (
          <article key={job.id} className="rounded border bg-white p-4">
            <Link href={`/jobs/${job.slug}`} className="font-semibold underline">
              {job.title}
            </Link>
            <p className="text-sm text-slate-600">{job.location ?? "Salem, OR"}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
