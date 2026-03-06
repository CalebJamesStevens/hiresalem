import { buildSitemapXml, buildXmlResponse, getJobsSitemapEntries } from "@/lib/sitemaps"

export const revalidate = 3600

export async function GET() {
  const entries = await getJobsSitemapEntries()
  return buildXmlResponse(buildSitemapXml(entries))
}
