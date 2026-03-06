import type { Metadata } from "next"

import { buildJobsSearchPath, hasActiveJobsSearchFilters, type JobsSearchParams } from "@/lib/job-search"

export const siteConfig = {
  name: "HireSalem",
  url: "https://hiresalem.com",
  defaultTitle: "Salem Jobs Board",
  defaultDescription:
    "Browse Salem-area jobs, discover local employers, and find openings across Salem, Keizer, and the greater mid-valley.",
  defaultOgImagePath: "/opengraph-image"
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

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString()
}

export function snippet(value: string | null | undefined, fallback: string, maxLength = 160) {
  const source = (value ?? fallback).replace(/\s+/g, " ").trim()
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
    return "Salem Jobs"
  }

  const parts = [
    params.q ? `${params.q} jobs` : null,
    params.location ? `in ${params.location}` : null,
    !params.q && !params.location ? "Search results" : null
  ].filter(Boolean)

  return parts.join(" ").trim() || "Search results"
}

export function getJobsPageDescription(params: JobsSearchParams) {
  if (isCleanJobsIndexPage(params)) {
    return "Browse local jobs in Salem, Keizer, and nearby mid-valley communities with fresh openings from Salem-area employers."
  }

  const filters = [
    params.q ? `keyword "${params.q}"` : null,
    params.location ? `location "${params.location}"` : null,
    params.workMode !== "any" ? `${params.workMode} work` : null,
    params.employmentType !== "any" ? params.employmentType.replaceAll("_", " ") : null,
    params.category !== "any" ? params.category.replaceAll("_", " ") : null
  ].filter(Boolean)

  return filters.length > 0
    ? `Filtered Salem-area job search for ${filters.join(", ")}. Browse the full jobs index for the main indexable page.`
    : "Filtered Salem-area job search results. Browse the full jobs index for the main indexable page."
}
