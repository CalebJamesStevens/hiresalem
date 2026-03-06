import { jobsLandingPages, resourceArticles } from "@/lib/seo-taxonomy"
import { absoluteUrl } from "@/lib/seo"
import { listCompaniesWithActiveJobsForSitemap, listPublicJobsForSitemap } from "@/lib/jobs"
import { buildCompanyJobsPath } from "@/lib/site-paths"

export type SitemapEntry = {
  path: string
  lastModified?: Date
}

const sitemapDocumentOptions = {
  headers: {
    "Content-Type": "application/xml; charset=utf-8"
  }
} as const

export function getStaticSitemapEntries(): SitemapEntry[] {
  return [
    { path: "/" },
    { path: "/jobs" },
    { path: "/resources" },
    ...resourceArticles.map((article) => ({
      path: article.path
    }))
  ]
}

export function getTaxonomySitemapEntries(): SitemapEntry[] {
  return jobsLandingPages.map((page) => ({
    path: page.path
  }))
}

export async function getJobsSitemapEntries(): Promise<SitemapEntry[]> {
  const jobs = await listPublicJobsForSitemap()

  return jobs.map((job) => ({
    path: `/jobs/${job.slug}`,
    lastModified: job.createdAt
  }))
}

export async function getPagesSitemapEntries(): Promise<SitemapEntry[]> {
  const companies = await listCompaniesWithActiveJobsForSitemap()

  return [
    ...getStaticSitemapEntries(),
    ...companies.map((company) => ({
      path: buildCompanyJobsPath(company.slug),
      lastModified: company.createdAt
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

export function buildSitemapXml(entries: SitemapEntry[]) {
  const body = entries
    .map((entry) => {
      const lastModified = entry.lastModified ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>` : ""
      return `<url><loc>${escapeXml(absoluteUrl(entry.path))}</loc>${lastModified}</url>`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`
}

export function buildSitemapIndexXml(paths: string[]) {
  const body = paths
    .map((path) => `<sitemap><loc>${escapeXml(absoluteUrl(path))}</loc></sitemap>`)
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`
}

export function buildXmlResponse(xml: string) {
  return new Response(xml, sitemapDocumentOptions)
}
