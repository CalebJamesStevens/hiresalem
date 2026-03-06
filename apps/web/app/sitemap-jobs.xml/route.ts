import { buildSitemapXml, buildXmlResponse, getJobsSitemapEntries } from "@/lib/sitemaps"

export const dynamic = "force-dynamic"

export async function GET() {
  const entries = await getJobsSitemapEntries()
  return buildXmlResponse(buildSitemapXml(entries))
}
