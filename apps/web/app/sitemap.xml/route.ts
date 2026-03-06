import { buildSitemapIndexXml, buildXmlResponse } from "@/lib/sitemaps"

export const revalidate = 3600

export async function GET() {
  return buildXmlResponse(buildSitemapIndexXml(["/sitemap-jobs.xml", "/sitemap-taxonomy.xml", "/sitemap-pages.xml"]))
}
