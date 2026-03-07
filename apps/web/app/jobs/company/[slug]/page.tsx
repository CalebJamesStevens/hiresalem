import Link from "next/link"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { JsonLd } from "@/components/json-ld"
import { getCompanyBySlug } from "@/lib/companies"
import { listActiveJobsForCompany } from "@/lib/jobs"
import { buildPageMetadata, snippet } from "@/lib/seo"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildCompanyOrganizationJsonLd,
  buildOrganizationJsonLd
} from "@/lib/structured-data"

type CompanyPageProps = {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: CompanyPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) {
    return buildPageMetadata({
      title: "Company not found",
      description: "The requested Salem-area company profile could not be found.",
      path: buildCompanyJobsPath(slug),
      robots: {
        index: false,
        follow: false
      }
    })
  }

  const companyJobs = await listActiveJobsForCompany(company.id)
  const description = snippet(
    companyJobs.length > 0
      ? `${company.name} is hiring in Salem, Oregon. Browse active local openings, employer details, and live jobs on HireSalem.`
      : `${company.name} is listed on HireSalem. Check back for new Salem-area openings from this employer.`,
    `${company.name} jobs on HireSalem.`,
    155
  )

  return buildPageMetadata({
    title: `${company.name} jobs in Salem Oregon`,
    description,
    path: buildCompanyJobsPath(company.slug),
    robots:
      companyJobs.length > 0
        ? undefined
        : {
            index: false,
            follow: true
          },
    keywords: [company.name, `${company.name} jobs`, "Salem Oregon jobs"]
  })
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) {
    notFound()
  }

  const companyJobs = await listActiveJobsForCompany(company.id)
  const companyPath = buildCompanyJobsPath(company.slug)
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Jobs", href: "/jobs" },
    { name: company.name, href: companyPath }
  ]

  return (
    <section className="space-y-8">
      <JsonLd
        data={buildBreadcrumbJsonLd(
          breadcrumbs.map((item) => ({
            name: item.name,
            path: item.href
          }))
        )}
      />
      <JsonLd
        data={[
          buildOrganizationJsonLd(),
          buildCompanyOrganizationJsonLd({
            name: company.name,
            path: companyPath,
            website: company.website
          }),
          buildCollectionPageJsonLd({
            name: `${company.name} jobs`,
            description: `${company.name} company profile and active Salem-area openings.`,
            path: companyPath,
            items: companyJobs.map((job) => ({
              name: job.title,
              path: `/jobs/${job.slug}`
            }))
          })
        ]}
      />

      <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Breadcrumbs items={breadcrumbs} />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{company.name}</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-700">
            Browse active openings from {company.name} on HireSalem. Company pages stay focused on live jobs so the page remains useful for
            Salem-area job seekers and for company-specific searches like "{company.name} jobs".
          </p>
          {company.website ? (
            <p className="text-slate-600">
              <Link href={company.website} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                {company.website}
              </Link>
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Open roles</h2>
            <p className="mt-1 text-sm text-slate-600">
              {companyJobs.length === 1 ? "1 active role" : `${companyJobs.length.toLocaleString()} active roles`}
            </p>
          </div>
          <Link href="/jobs" className="text-sm font-medium text-slate-700 underline underline-offset-4">
            Browse all Salem-area jobs
          </Link>
        </div>

        {companyJobs.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-xl font-semibold text-slate-900">No active jobs posted right now</h3>
            <p className="mt-2 text-sm text-slate-600">
              This company profile only surfaces active roles. Check back soon or widen the search through the main Salem jobs page.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4">
          {companyJobs.map((job) => (
            <article key={job.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-2">
                <Link href={`/jobs/${job.slug}`} className="text-xl font-semibold text-slate-900 underline underline-offset-4">
                  {job.title}
                </Link>
                <p className="text-sm text-slate-600">{job.location ?? "Salem, OR"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
