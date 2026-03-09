import { EDITORIAL_CONTENT_LAST_MODIFIED, jobsLandingPages, resourceArticles } from "@/lib/seo-taxonomy"
import { absoluteUrl } from "@/lib/seo"
import { listCompaniesWithActiveJobsForSitemap, listPublicJobsForSitemap } from "@/lib/jobs"
import { buildCompanyJobsPath } from "@/lib/site-paths"

export type SitemapEntry = {
  path: string
  lastModified?: Date | string
}

const sitemapDocumentOptions = {
  headers: {
    "Content-Type": "application/xml; charset=utf-8"
  }
} as const

export function getStaticSitemapEntries(): SitemapEntry[] {
  return [
    { path: "/", lastModified: EDITORIAL_CONTENT_LAST_MODIFIED },
    { path: "/jobs", lastModified: EDITORIAL_CONTENT_LAST_MODIFIED },
    { path: "/resources", lastModified: EDITORIAL_CONTENT_LAST_MODIFIED },
    ...resourceArticles.map((article) => ({
      path: article.path,
      lastModified: EDITORIAL_CONTENT_LAST_MODIFIED
    }))
  ]
}

export function getTaxonomySitemapEntries(): SitemapEntry[] {
  return jobsLandingPages.map((page) => ({
    path: page.path,
    lastModified: EDITORIAL_CONTENT_LAST_MODIFIED
  }))
}

export function getJobSitemapLastModified(job: { activatedAt?: Date | null; createdAt: Date }) {
  return toSitemapDate(job.activatedAt) ?? toSitemapDate(job.createdAt)
}

export function getCompanySitemapLastModified(company: {
  latestActiveJobActivatedAt?: Date | string | null
  latestActiveJobCreatedAt?: Date | string | null
  createdAt: Date | string
}) {
  return (
    toSitemapDate(company.latestActiveJobActivatedAt) ??
    toSitemapDate(company.latestActiveJobCreatedAt) ??
    toSitemapDate(company.createdAt)
  )
}

export async function getJobsSitemapEntries(): Promise<SitemapEntry[]> {
  const jobs = await listPublicJobsForSitemap()

  return jobs.map((job) => ({
    path: `/jobs/${job.slug}`,
    lastModified: getJobSitemapLastModified(job)
  }))
}

export async function getPagesSitemapEntries(): Promise<SitemapEntry[]> {
  const companies = await listCompaniesWithActiveJobsForSitemap()

  return [
    ...getStaticSitemapEntries(),
    ...companies.map((company) => ({
      path: buildCompanyJobsPath(company.slug),
      lastModified: getCompanySitemapLastModified(company)
    }))
  ]
}

export async function getSitemapCounts() {
  const [jobsEntries, pagesEntries] = await Promise.all([getJobsSitemapEntries(), getPagesSitemapEntries()])

  return {
    jobs: jobsEntries.length,
    taxonomy: getTaxonomySitemapEntries().length,
    pages: pagesEntries.length,
    total: jobsEntries.length + getTaxonomySitemapEntries().length + pagesEntries.length
  }
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function toSitemapDate(value?: Date | string | null) {
  if (!value) {
    return undefined
  }

  return value instanceof Date ? value : new Date(value)
}

export function buildSitemapXml(entries: SitemapEntry[]) {
  const body = entries
    .map((entry) => {
      const lastModifiedDate = toSitemapDate(entry.lastModified)
      const lastModified = lastModifiedDate ? `<lastmod>${lastModifiedDate.toISOString()}</lastmod>` : ""
      return `<url><loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastModified}</url>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}

export function buildSitemapIndexXml(entries: Array<string | SitemapEntry>) {
  const normalizedEntries = entries.map((entry) => (typeof entry === "string" ? { path: entry } : entry))

  const body = normalizedEntries
    .map((entry) => {
      const lastModifiedDate = toSitemapDate(entry.lastModified)
      const lastModified = lastModifiedDate ? `<lastmod>${lastModifiedDate.toISOString()}</lastmod>` : ""
      return `<sitemap><loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastModified}</sitemap>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`
}

export function buildXmlResponse(xml: string) {
  return new Response(xml, sitemapDocumentOptions)
}
