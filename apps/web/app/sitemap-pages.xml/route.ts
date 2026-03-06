import { buildSitemapXml, buildXmlResponse, getPagesSitemapEntries } from "@/lib/sitemaps"

export const dynamic = "force-dynamic"

export async function GET() {
  const entries = await getPagesSitemapEntries()
  return buildXmlResponse(buildSitemapXml(entries))
}
