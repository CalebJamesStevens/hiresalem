import type { Metadata } from "next"

import { buildJobsSearchPath, hasActiveJobsSearchFilters, type JobsSearchParams } from "@/lib/job-search"
import { markdownToPlainText } from "@/lib/markdown"

export const siteConfig = {
  name: "HireSalem",
  url: "https://hiresalem.com",
  canonicalHost: "hiresalem.com",
  defaultTitle: "Jobs in Salem, Oregon",
  defaultDescription:
    "Find jobs in Salem, Oregon with local employers, fresh listings, and nearby opportunities across the mid-valley.",
  defaultOgImagePath: "/opengraph-image",
  organizationLogoPath: "/icon-512.png"
} as const

export const serviceAreas = [
  { slug: "salem", name: "Salem", region: "Oregon" },
  { slug: "keizer", name: "Keizer", region: "Oregon" },
  { slug: "woodburn", name: "Woodburn", region: "Oregon" },
  { slug: "dallas", name: "Dallas", region: "Oregon" },
  { slug: "monmouth", name: "Monmouth", region: "Oregon" },
  { slug: "independence", name: "Independence", region: "Oregon" },
  { slug: "silverton", name: "Silverton", region: "Oregon" }
] as const

export type SeoMetadataInput = {
  title: string
  description: string
  path: string
  keywords?: string[]
  imagePath?: string
  robots?: Metadata["robots"]
}

const liveSiteHosts = new Set([siteConfig.canonicalHost, `www.${siteConfig.canonicalHost}`])

function trimTrailingSlash(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value
}

export function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1" || hostname.endsWith(".local")
}

export function normalizePublicOrigin(origin?: string | null) {
  if (!origin) {
    return siteConfig.url
  }

  try {
    const parsed = new URL(origin)

    if (liveSiteHosts.has(parsed.hostname)) {
      return siteConfig.url
    }

    return trimTrailingSlash(`${parsed.protocol}//${parsed.host}`)
  } catch {
    return siteConfig.url
  }
}

export function getPublicOrigin(origin?: string | null) {
  return normalizePublicOrigin(origin)
}

export function absoluteUrl(path = "/", origin = siteConfig.url) {
  return new URL(path, normalizePublicOrigin(origin)).toString()
}

export function getCanonicalRedirectUrl(input: { url: string; forwardedProto?: string | null }) {
  const requestUrl = new URL(input.url)
  const forwardedProto = input.forwardedProto?.split(",")[0]?.trim()
  const requestProtocol = forwardedProto || requestUrl.protocol.replace(":", "")

  if (!liveSiteHosts.has(requestUrl.hostname)) {
    return null
  }

  if (requestUrl.hostname === siteConfig.canonicalHost && requestProtocol === "https") {
    return null
  }

  return absoluteUrl(`${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`)
}

export function snippet(value: string | null | undefined, fallback: string, maxLength = 160) {
  const source = (markdownToPlainText(value) || fallback).replace(/\s+/g, " ").trim()
  if (source.length <= maxLength) {
    return source
  }

  return `${source.slice(0, maxLength - 1).trimEnd()}...`
}

export function buildPageMetadata({
  title,
  description,
  path,
  keywords,
  imagePath = siteConfig.defaultOgImagePath,
  robots
}: SeoMetadataInput): Metadata {
  const canonicalUrl = absoluteUrl(path)
  const imageUrl = absoluteUrl(imagePath)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl
    },
    robots,
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: siteConfig.name,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  }
}

export function isCleanJobsIndexPage(params: JobsSearchParams) {
  return !hasActiveJobsSearchFilters(params) && params.page === 1
}

export function getJobsPageRobots(params: JobsSearchParams): Metadata["robots"] | undefined {
  if (isCleanJobsIndexPage(params)) {
    return undefined
  }

  return {
    index: false,
    follow: true
  }
}

export function getJobsPageCanonicalPath(params: JobsSearchParams) {
  if (isCleanJobsIndexPage(params)) {
    return buildJobsSearchPath(params)
  }

  return "/jobs"
}

export function getJobsPageTitle(params: JobsSearchParams) {
  if (isCleanJobsIndexPage(params)) {
    return "All HireSalem Jobs"
  }

  const parts = [
    params.q ? `${params.q} jobs` : null,
    params.location ? `for ${params.location}` : null,
    !params.q && !params.location ? "Filtered jobs" : null
  ].filter(Boolean)

  return parts.join(" ").trim() || "Filtered jobs"
}

export function getJobsPageDescription(params: JobsSearchParams) {
  if (isCleanJobsIndexPage(params)) {
    return "Browse the full searchable HireSalem index, compare employers, and use filters before jumping into Salem-specific landing pages."
  }

  const filters = [
    params.q ? `keyword "${params.q}"` : null,
    params.location ? `location "${params.location}"` : null,
    params.workMode !== "any" ? `${params.workMode} work` : null,
    params.employmentType !== "any" ? params.employmentType.replaceAll("_", " ") : null,
    params.category !== "any" ? params.category.replaceAll("_", " ") : null
  ].filter(Boolean)

  return filters.length > 0
    ? `Filtered job results for ${filters.join(", ")}. Browse the main jobs index for the primary indexable page.`
    : "Filtered job results. Browse the main jobs index for the primary indexable page."
}
