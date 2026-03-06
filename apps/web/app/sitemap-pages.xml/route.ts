import { buildSitemapXml, buildXmlResponse, getPagesSitemapEntries } from "@/lib/sitemaps"

export const revalidate = 3600

export async function GET() {
  const entries = await getPagesSitemapEntries()
  return buildXmlResponse(buildSitemapXml(entries))
}
