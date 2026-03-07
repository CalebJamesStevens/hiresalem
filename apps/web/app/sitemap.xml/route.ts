import { buildSitemapIndexXml, buildXmlResponse, getJobsSitemapEntries, getPagesSitemapEntries } from "@/lib/sitemaps"

export const revalidate = 3600

function getLatestLastModified(entries: Array<{ lastModified?: Date | string }>) {
  return entries.reduce<Date | undefined>((latest, entry) => {
    const current = entry.lastModified instanceof Date ? entry.lastModified : entry.lastModified ? new Date(entry.lastModified) : undefined

    if (!current) {
      return latest
    }

    if (!latest || current > latest) {
      return current
    }

    return latest
  }, undefined)
}

export async function GET() {
  const [jobsEntries, pagesEntries] = await Promise.all([getJobsSitemapEntries(), getPagesSitemapEntries()])

  return buildXmlResponse(
    buildSitemapIndexXml([
      {
        path: "/sitemap-jobs.xml",
        lastModified: getLatestLastModified(jobsEntries)
      },
      "/sitemap-taxonomy.xml",
      {
        path: "/sitemap-pages.xml",
        lastModified: getLatestLastModified(pagesEntries)
      }
    ])
  )
}
