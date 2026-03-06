import { describe, expect, test } from "bun:test"

import { buildSitemapIndexXml, buildSitemapXml, getStaticSitemapEntries, getTaxonomySitemapEntries } from "@/lib/sitemaps"

describe("sitemap helpers", () => {
  test("keeps the taxonomy sitemap aligned to the /jobs IA", () => {
    const paths = getTaxonomySitemapEntries().map((entry) => entry.path)

    expect(paths).toContain("/jobs/salem")
    expect(paths).toContain("/jobs/salem/restaurant")
    expect(paths).toContain("/jobs/keizer")
    expect(paths.some((path) => path.startsWith("/salem-jobs"))).toBe(false)
  })

  test("keeps static sitemap entries on public indexable routes", () => {
    const paths = getStaticSitemapEntries().map((entry) => entry.path)

    expect(paths).toContain("/")
    expect(paths).toContain("/jobs")
    expect(paths).toContain("/resources")
  })

  test("builds xml documents for sitemap feeds and indexes", () => {
    const sitemapXml = buildSitemapXml([{ path: "/jobs/salem" }])
    const sitemapIndexXml = buildSitemapIndexXml(["/sitemap-jobs.xml"])

    expect(sitemapXml).toContain("https://hiresalem.com/jobs/salem")
    expect(sitemapIndexXml).toContain("https://hiresalem.com/sitemap-jobs.xml")
  })
})
