import { buildSitemapXml, buildXmlResponse, getTaxonomySitemapEntries } from "@/lib/sitemaps"

export const revalidate = 3600

export async function GET() {
  return buildXmlResponse(buildSitemapXml(getTaxonomySitemapEntries()))
}
