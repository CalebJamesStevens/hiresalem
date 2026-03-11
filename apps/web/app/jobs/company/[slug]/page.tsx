import Link from "next/link"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { JsonLd } from "@/components/json-ld"
import { getCompanyBySlug } from "@/lib/companies"
import { categoryOptions } from "@/lib/job-search"
import { listActiveJobsForCompany } from "@/lib/jobs"
import { buildPageMetadata, snippet } from "@/lib/seo"
import { getJobHubLinksForContext } from "@/lib/seo-taxonomy"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildCompanyOrganizationJsonLd
} from "@/lib/structured-data"

type CompanyPageProps = {
  params: Promise<{
    slug: string
  }>
}

function formatList(values: string[]) {
  if (values.length === 0) {
    return ""
  }

  if (values.length === 1) {
    return values[0]!
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`
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
  const categories = Array.from(
    new Set(
      companyJobs
        .map((job) => categoryOptions.find((option) => option.value === job.category)?.label)
        .filter((value): value is Exclude<typeof value, undefined> => value !== undefined)
    )
  ).slice(0, 3)
  const description = snippet(
    companyJobs.length > 0
      ? `${company.name} has ${companyJobs.length} active ${companyJobs.length === 1 ? "job" : "jobs"} on HireSalem${
          categories.length > 0 ? ` across ${formatList(categories)}` : ""
        }. Browse live local openings and employer-specific hiring updates in Salem, Oregon.`
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
  const categories = Array.from(
    new Set(
      companyJobs
        .map((job) => categoryOptions.find((option) => option.value === job.category)?.label)
        .filter((value): value is Exclude<typeof value, undefined> => value !== undefined)
    )
  )
  const hubLinks = getJobHubLinksForContext({
    categories: companyJobs.map((job) => job.category),
    locations: companyJobs.map((job) => job.location),
    includeJobsIndex: true
  })
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Salem jobs", href: "/jobs/salem" },
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
            {company.name} currently has {companyJobs.length} active {companyJobs.length === 1 ? "job" : "jobs"} on HireSalem. Use this page to
            browse the employer&apos;s live openings, then compare them with broader Salem hiring paths.
          </p>
          {categories.length > 0 ? (
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Current openings on this page span {formatList(categories.slice(0, 4))}, which makes this a useful employer hub for Salem-area
              candidates comparing role families as well as a specific company.
            </p>
          ) : null}
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

      {hubLinks.length > 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-950">Keep exploring Salem hiring</h2>
            <p className="text-sm leading-6 text-slate-600">
              Compare {company.name} with broader Salem job hubs, category pages, and the full HireSalem jobs index.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hubLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900">{link.title}</h3>
                  <p className="text-sm leading-6 text-slate-600">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
