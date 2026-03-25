import Link from "next/link"
import { notFound } from "next/navigation"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { EmployerAnalyticsTracker } from "@/components/employer-analytics-tracker"
import { FeaturedJobBadge } from "@/components/featured-job-badge"
import { JsonLd } from "@/components/json-ld"
import { MarkdownContent } from "@/components/markdown-content"
import {
  buildCompanyProfilePageDescription,
  getCompanyBySlug,
  getCompanyProfileInitials,
  getCompanyPublicProfileContent,
  hasIndexableCompanyProfileContent
} from "@/lib/companies"
import { categoryOptions } from "@/lib/job-search"
import { listActiveJobsForCompany } from "@/lib/jobs"
import { buildPageMetadata } from "@/lib/seo"
import { getJobHubLinksForContext } from "@/lib/seo-taxonomy"
import { buildCompanyJobsPath } from "@/lib/site-paths"
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildCompanyOrganizationJsonLd } from "@/lib/structured-data"

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

function getCompanyIntroText(input: {
  name: string
  shortDescription?: string | null
  aboutSection?: string | null
  location?: string | null
}) {
  if (input.shortDescription?.trim()) {
    return input.shortDescription.trim()
  }

  if (input.aboutSection?.trim()) {
    return input.aboutSection.trim()
  }

  if (input.location?.trim()) {
    return `${input.name} is based in ${input.location.trim()} and uses HireSalem to share local hiring opportunities.`
  }

  return `${input.name} uses HireSalem to share local hiring opportunities and keep candidates up to date on active openings.`
}

function getSocialLinkLabel(id: string) {
  if (id === "linkedinUrl") {
    return "LinkedIn"
  }

  if (id === "facebookUrl") {
    return "Facebook"
  }

  if (id === "instagramUrl") {
    return "Instagram"
  }

  return "Social"
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

  const publicProfile = getCompanyPublicProfileContent(company)
  const companyJobs = await listActiveJobsForCompany(company.id)
  const hasIndexableProfile = hasIndexableCompanyProfileContent(publicProfile)
  const description = buildCompanyProfilePageDescription({
    name: company.name,
    shortDescription: publicProfile.shortDescription,
    aboutSection: publicProfile.aboutSection,
    location: company.location,
    activeJobCount: companyJobs.length
  })

  return buildPageMetadata({
    title: companyJobs.length > 0 ? `${company.name} jobs in Salem Oregon` : `${company.name} company profile in Salem Oregon`,
    description,
    path: buildCompanyJobsPath(company.slug),
    robots:
      companyJobs.length > 0 || hasIndexableProfile
        ? undefined
        : {
            index: false,
            follow: true
          },
    keywords:
      companyJobs.length > 0
        ? [company.name, `${company.name} jobs`, "Salem Oregon jobs"]
        : [company.name, `${company.name} Salem Oregon`, "Salem Oregon employers"]
  })
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { slug } = await params
  const company = await getCompanyBySlug(slug)

  if (!company) {
    notFound()
  }

  const publicProfile = getCompanyPublicProfileContent(company)
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
  const introText = getCompanyIntroText({
    name: company.name,
    shortDescription: publicProfile.shortDescription,
    aboutSection: publicProfile.aboutSection,
    location: company.location
  })
  const hasEnhancedSections = Boolean(publicProfile.aboutSection || publicProfile.whyWorkHere || publicProfile.benefits || publicProfile.socialLinks.length > 0)

  return (
    <section className="space-y-8">
      <EmployerAnalyticsTracker companyId={company.id} eventType="company_view" entityKey={company.id} />
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
            website: company.website,
            logoUrl: company.logoUrl,
            imageUrl: publicProfile.coverImageUrl,
            description: publicProfile.shortDescription ?? publicProfile.aboutSection,
            sameAs: publicProfile.socialLinks.map((link) => link.href)
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

      <section
        className={`overflow-hidden rounded-[2rem] border shadow-sm ${
          publicProfile.usesEnhancedPresentation
            ? "border-amber-200 bg-gradient-to-br from-white via-amber-50 to-slate-100"
            : "border-slate-200 bg-white"
        }`}
      >
        {publicProfile.coverImageUrl ? (
          <div className="relative h-56 overflow-hidden border-b border-black/10 md:h-72">
            <img src={publicProfile.coverImageUrl} alt={`${company.name} cover`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/20 to-transparent" />
          </div>
        ) : null}

        <div className={`space-y-5 p-6 ${publicProfile.coverImageUrl ? "md:-mt-16 md:relative md:z-10" : ""}`}>
          <Breadcrumbs items={breadcrumbs} />

          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className={`h-20 w-20 rounded-2xl object-cover ${publicProfile.usesEnhancedPresentation ? "border border-white bg-white shadow-lg" : "border border-slate-200"}`}
              />
            ) : (
              <div
                className={`flex h-20 w-20 items-center justify-center rounded-2xl text-xl font-semibold ${
                  publicProfile.usesEnhancedPresentation ? "bg-slate-900 text-white shadow-lg" : "bg-slate-900 text-white"
                }`}
              >
                {getCompanyProfileInitials(company.name)}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{company.name}</h1>
                  {company.claimedAt ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
                      Claimed business
                    </span>
                  ) : (
                    <Link
                      href={`/claim-business/${company.slug}`}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"
                    >
                      Claim this business page
                    </Link>
                  )}
                </div>
                <p className="max-w-3xl text-base leading-7 text-slate-700">{introText}</p>
              </div>

              <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                {company.location ? (
                  <span className={`rounded-full px-3 py-1 ${publicProfile.usesEnhancedPresentation ? "border border-amber-200 bg-white/80" : "border border-slate-200 bg-slate-50"}`}>
                    {company.location}
                  </span>
                ) : null}
                <span className={`rounded-full px-3 py-1 ${publicProfile.usesEnhancedPresentation ? "border border-amber-200 bg-white/80" : "border border-slate-200 bg-slate-50"}`}>
                  {companyJobs.length === 1 ? "1 active role" : `${companyJobs.length.toLocaleString()} active roles`}
                </span>
                {categories.length > 0 ? (
                  <span className={`rounded-full px-3 py-1 ${publicProfile.usesEnhancedPresentation ? "border border-amber-200 bg-white/80" : "border border-slate-200 bg-slate-50"}`}>
                    {formatList(categories.slice(0, 3))}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-700">
                {company.website ? (
                  <Link href={company.website} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                    Visit company website
                  </Link>
                ) : null}
                {publicProfile.socialLinks.map((link) => (
                  <Link key={link.id} href={link.href} className="underline underline-offset-4" target="_blank" rel="noreferrer">
                    {getSocialLinkLabel(link.id)}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {publicProfile.galleryImageUrls.length > 0 ? (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-950">Inside the team</h2>
            <p className="text-sm leading-6 text-slate-600">A quick look at the workplace and brand presence this employer shared with candidates.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {publicProfile.galleryImageUrls.map((imageUrl, index) => (
              <div key={imageUrl} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
                <img src={imageUrl} alt={`${company.name} gallery image ${index + 1}`} className="h-64 w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {hasEnhancedSections ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {publicProfile.aboutSection ? (
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-950">About {company.name}</h2>
                <div className="prose prose-slate max-w-none">
                  <MarkdownContent value={publicProfile.aboutSection} />
                </div>
              </div>
            </article>
          ) : null}

          {publicProfile.whyWorkHere ? (
            <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-950">Why work here</h2>
                <div className="prose prose-slate max-w-none">
                  <MarkdownContent value={publicProfile.whyWorkHere} />
                </div>
              </div>
            </article>
          ) : null}

          {publicProfile.benefits ? (
            <article className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm ${publicProfile.aboutSection ? "lg:col-span-3" : "lg:col-span-2"}`}>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-slate-950">Benefits and perks</h2>
                <div className="prose prose-slate max-w-none">
                  <MarkdownContent value={publicProfile.benefits} />
                </div>
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

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
            <article
              key={job.id}
              className={`rounded-[2rem] border p-5 shadow-sm ${
                job.isFeatured ? "border-indigo-200 bg-white shadow-[0_12px_32px_-28px_rgba(37,99,235,0.45)]" : "border-slate-200 bg-white"
              }`}
            >
              <div className="space-y-2">
                {job.isFeatured ? <FeaturedJobBadge /> : null}
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
