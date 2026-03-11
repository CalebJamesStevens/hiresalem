import { describe, expect, test } from "bun:test"

import { EDITORIAL_CONTENT_LAST_MODIFIED } from "@/lib/seo-taxonomy"
import {
  buildSitemapIndexXml,
  buildSitemapXml,
  getJobSitemapLastModified,
  getStaticSitemapEntries,
  getTaxonomySitemapEntries
} from "@/lib/sitemaps"

describe("sitemap helpers", () => {
  test("keeps the taxonomy sitemap aligned to the /jobs IA", () => {
    const paths = getTaxonomySitemapEntries().map((entry) => entry.path)

    expect(paths).toContain("/jobs/salem")
    expect(paths).toContain("/jobs/salem/restaurant")
    expect(paths).toContain("/jobs/keizer")
    expect(paths.some((path) => path.startsWith("/salem-jobs"))).toBe(false)
  })

  test("keeps static sitemap entries on public indexable routes", () => {
    const entries = getStaticSitemapEntries()
    const paths = entries.map((entry) => entry.path)

    expect(paths).toContain("/")
    expect(paths).toContain("/jobs")
    expect(paths).toContain("/resources")
    expect(entries.find((entry) => entry.path === "/resources")?.lastModified).toBe(EDITORIAL_CONTENT_LAST_MODIFIED)
  })

  test("marks editorial landing pages with a shared lastmod", () => {
    const taxonomyEntries = getTaxonomySitemapEntries()

    expect(taxonomyEntries.find((entry) => entry.path === "/jobs/salem")?.lastModified).toBe(EDITORIAL_CONTENT_LAST_MODIFIED)
    expect(taxonomyEntries.find((entry) => entry.path === "/jobs/keizer")?.lastModified).toBe(EDITORIAL_CONTENT_LAST_MODIFIED)
  })

  test("builds xml documents for sitemap feeds and indexes", () => {
    const sitemapXml = buildSitemapXml([{ path: "/jobs/salem" }])
    const sitemapIndexXml = buildSitemapIndexXml(["/sitemap-jobs.xml"])

    expect(sitemapXml).toContain("https://hiresalem.com/jobs/salem")
    expect(sitemapIndexXml).toContain("https://hiresalem.com/sitemap-jobs.xml")
    expect(sitemapXml).not.toContain("www.hiresalem.com")
    expect(sitemapIndexXml).not.toContain("www.hiresalem.com")
  })

  test("prefers activatedAt for job sitemap freshness", () => {
    const createdAt = new Date("2026-03-01T12:00:00.000Z")
    const activatedAt = new Date("2026-03-03T12:00:00.000Z")

    expect(
      getJobSitemapLastModified({
        createdAt,
        activatedAt
      })
    ).toBe(activatedAt)
    expect(
      getJobSitemapLastModified({
        createdAt,
        activatedAt: null
      })
    ).toBe(createdAt)
  })

  test("emits sitemap index lastmod values and preserves XML escaping", () => {
    const lastModified = new Date("2026-03-07T12:00:00.000Z")
    const sitemapXml = buildSitemapXml([{ path: "/jobs/salem?tag=a&b=c", lastModified }])
    const sitemapIndexXml = buildSitemapIndexXml([{ path: "/sitemap-jobs.xml?tag=a&b=c", lastModified }])

    expect(sitemapXml).toContain("https://hiresalem.com/jobs/salem?tag=a&amp;b=c")
    expect(sitemapXml).toContain(`<lastmod>${lastModified.toISOString()}</lastmod>`)
    expect(sitemapIndexXml).toContain("https://hiresalem.com/sitemap-jobs.xml?tag=a&amp;b=c")
    expect(sitemapIndexXml).toContain(`<lastmod>${lastModified.toISOString()}</lastmod>`)
  })
})
