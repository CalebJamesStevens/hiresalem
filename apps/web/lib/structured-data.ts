import { getAbsoluteCompanyImageUrl } from "@/lib/company-image-storage"
import { siteConfig, absoluteUrl } from "@/lib/seo"

type BreadcrumbItem = {
  name: string
  path: string
}

type CollectionItem = {
  name: string
  path: string
}

export type JobLocationInput = {
  city: string
  region: string
  country: string
  streetAddress?: string | null
  postalCode?: string | null
}

type JobPostingInput = {
  title: string
  description: string
  path: string
  datePosted: Date
  validThrough?: Date | null
  employmentType?: string | null
  hiringOrganizationName?: string | null
  hiringOrganizationWebsite?: string | null
  jobLocation?: JobLocationInput | null
  applicantLocationCountry?: string | null
  isRemote?: boolean
  baseSalary?: {
    currency: string
    minValue?: number | null
    maxValue?: number | null
    unitText?: string | null
  } | null
}

const salaryUnitTextMap: Record<string, string> = {
  hour: "HOUR",
  week: "WEEK",
  month: "MONTH",
  year: "YEAR"
}

const supportedJobLocationCities = {
  salem: "Salem",
  keizer: "Keizer",
  woodburn: "Woodburn",
  dallas: "Dallas",
  monmouth: "Monmouth",
  independence: "Independence",
  silverton: "Silverton"
} as const

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

function findSupportedCity(value: string) {
  const matches = Object.entries(supportedJobLocationCities)
    .map(([slug, city]) => ({
      city,
      index: value.search(new RegExp(`\\b${slug}\\b`, "i"))
    }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index)

  return matches[0]?.city ?? null
}

export function inferJobLocationFromLegacyText(location?: string | null): JobLocationInput | null {
  if (!location) {
    return null
  }

  const normalized = normalizeWhitespace(location)

  if (!normalized) {
    return null
  }

  const directCity = findSupportedCity(normalized)

  if (normalized.includes("/")) {
    if (!directCity) {
      return null
    }

    return {
      city: directCity,
      region: "OR",
      country: "US"
    }
  }

  if (/\b(remote|work from home|wfh|telecommute)\b/i.test(normalized)) {
    return null
  }

  if (!directCity) {
    return null
  }

  const locationPrefix = normalized.split(",")[0] ?? normalized
  const prefixCity = findSupportedCity(locationPrefix)

  if (!prefixCity) {
    return null
  }

  return {
    city: prefixCity,
    region: "OR",
    country: "US"
  }
}

export const normalizeJobLocation = inferJobLocationFromLegacyText

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.organizationLogoPath),
    areaServed: ["Salem", "Keizer", "Woodburn", "Dallas", "Monmouth", "Independence", "Silverton"],
    knowsAbout: ["Jobs", "Hiring", "Salem jobs", "Local employers"]
  }
}

export function buildCompanyOrganizationJsonLd(input: {
  name: string
  path: string
  website?: string | null
  logoUrl?: string | null
  imageUrl?: string | null
  description?: string | null
  sameAs?: string[]
}) {
  const sameAs = [input.website ?? null, ...(input.sameAs ?? [])].filter((value): value is string => Boolean(value))

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl(`${input.path}#organization`),
    name: input.name,
    url: absoluteUrl(input.path),
    description: input.description ?? undefined,
    logo: getAbsoluteCompanyImageUrl(input.logoUrl) ?? undefined,
    image: getAbsoluteCompanyImageUrl(input.imageUrl) ?? getAbsoluteCompanyImageUrl(input.logoUrl) ?? undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined
  }
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: siteConfig.name,
    url: siteConfig.url,
    publisher: {
      "@id": absoluteUrl("/#organization")
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/jobs?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  }
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  }
}

export function buildCollectionPageJsonLd(input: {
  name: string
  description: string
  path: string
  items: CollectionItem[]
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": absoluteUrl(`${input.path}#collection`),
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@id": absoluteUrl("/#website")
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(item.path),
        name: item.name
      }))
    }
  }
}

export function buildFaqJsonLd(questions: Array<{ question: string; answer: string }>) {
  if (questions.length === 0) {
    return null
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  }
}

export function buildArticleJsonLd(input: {
  headline: string
  description: string
  path: string
  datePublished?: Date | null
  dateModified?: Date | null
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": absoluteUrl(`${input.path}#article`),
    headline: input.headline,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(input.path)
    },
    publisher: {
      "@id": absoluteUrl("/#organization")
    },
    datePublished: input.datePublished?.toISOString(),
    dateModified: input.dateModified?.toISOString()
  }
}

export function buildJobPostingJsonLd(input: JobPostingInput) {
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    temporary: "TEMPORARY"
  }

  const normalizedSalaryUnitText = input.baseSalary?.unitText
    ? salaryUnitTextMap[input.baseSalary.unitText] ?? input.baseSalary.unitText
    : undefined

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": absoluteUrl(`${input.path}#jobposting`),
    title: input.title,
    description: input.description,
    datePosted: input.datePosted.toISOString(),
    validThrough: input.validThrough?.toISOString(),
    employmentType: input.employmentType ? employmentTypeMap[input.employmentType] ?? input.employmentType : undefined,
    hiringOrganization: input.hiringOrganizationName
      ? {
          "@type": "Organization",
          name: input.hiringOrganizationName,
          sameAs: input.hiringOrganizationWebsite ? [input.hiringOrganizationWebsite] : undefined
        }
      : undefined,
    jobLocation:
      input.isRemote === true
        ? undefined
        : input.jobLocation
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            streetAddress: input.jobLocation.streetAddress ?? undefined,
            addressLocality: input.jobLocation.city,
            addressRegion: input.jobLocation.region,
            postalCode: input.jobLocation.postalCode ?? undefined,
            addressCountry: input.jobLocation.country
          }
        }
      : undefined,
    jobLocationType: input.isRemote === true ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements:
      input.isRemote === true && input.applicantLocationCountry
        ? {
            "@type": "Country",
            name: input.applicantLocationCountry
          }
        : undefined,
    baseSalary: input.baseSalary
      ? {
          "@type": "MonetaryAmount",
          currency: input.baseSalary.currency,
          value: {
            "@type": "QuantitativeValue",
            minValue: input.baseSalary.minValue ?? undefined,
            maxValue: input.baseSalary.maxValue ?? undefined,
            unitText: normalizedSalaryUnitText
          }
        }
      : undefined,
    mainEntityOfPage: absoluteUrl(input.path),
    url: absoluteUrl(input.path),
  }
}
