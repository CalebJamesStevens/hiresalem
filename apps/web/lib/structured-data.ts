import { siteConfig, absoluteUrl } from "@/lib/seo"

type BreadcrumbItem = {
  name: string
  path: string
}

type CollectionItem = {
  name: string
  path: string
}

type JobPostingInput = {
  title: string
  description: string
  path: string
  datePosted: Date
  employmentType?: string | null
  hiringOrganizationName?: string | null
  hiringOrganizationPath?: string | null
  jobLocation?: string | null
  baseSalary?: {
    currency: string
    minValue?: number | null
    maxValue?: number | null
    unitText?: string | null
  } | null
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    areaServed: ["Salem", "Keizer", "Woodburn", "Dallas", "Monmouth", "Independence", "Silverton"],
    knowsAbout: ["Jobs", "Hiring", "Salem jobs", "Local employers"],
    sameAs: [siteConfig.url]
  }
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
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
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url
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

export function buildJobPostingJsonLd(input: JobPostingInput) {
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    internship: "INTERN",
    temporary: "TEMPORARY"
  }

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: input.title,
    description: input.description,
    datePosted: input.datePosted.toISOString(),
    employmentType: input.employmentType ? employmentTypeMap[input.employmentType] ?? input.employmentType : undefined,
    hiringOrganization: input.hiringOrganizationName
      ? {
          "@type": "Organization",
          name: input.hiringOrganizationName,
          sameAs: input.hiringOrganizationPath ? absoluteUrl(input.hiringOrganizationPath) : undefined
        }
      : undefined,
    jobLocation: input.jobLocation
      ? {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressLocality: input.jobLocation,
            addressRegion: "OR",
            addressCountry: "US"
          }
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
            unitText: input.baseSalary.unitText ?? undefined
          }
        }
      : undefined,
    url: absoluteUrl(input.path),
    directApply: true
  }
}
