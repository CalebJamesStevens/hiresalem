import { notFound } from "next/navigation"

import { JobsLandingPageView } from "@/components/jobs-landing-page"
import { normalizeRoles } from "@/lib/authz"
import { listTopEmployers, searchPublicJobs } from "@/lib/jobs"
import { buildPageMetadata } from "@/lib/seo"
import { allResourceArticleLinks, getJobsLandingPageBySlug, primaryLandingLinks } from "@/lib/seo-taxonomy"
import { getSessionSafe } from "@/lib/session"

const pageContent = getJobsLandingPageBySlug("salem")

export const dynamic = "force-dynamic"

export const metadata = pageContent
  ? buildPageMetadata({
      title: pageContent.seoTitle,
      description: pageContent.seoDescription,
      path: pageContent.path,
      keywords: ["Salem Oregon jobs", "jobs in Salem Oregon", "hiring Salem Oregon", "Salem job board"]
    })
  : undefined

export default async function SalemJobsLandingPage() {
  if (!pageContent) {
    notFound()
  }

  const [searchResult, topEmployers, session] = await Promise.all([searchPublicJobs(pageContent.searchParams), listTopEmployers(6), getSessionSafe()])
  const roles = normalizeRoles(session?.user?.roles)
  const showInlineEmployerPromo = !roles.includes("business") && !roles.includes("admin")

  return (
    <JobsLandingPageView
      page={pageContent}
      searchResult={searchResult}
      featuredLinks={primaryLandingLinks.filter((item) => item.href !== "/jobs/salem" && item.href !== "/jobs/keizer")}
      featuredLinksTitle="Popular Salem job paths"
      featuredEmployers={topEmployers}
      resourceLinks={allResourceArticleLinks.slice(0, 3)}
      showInlineEmployerPromo={showInlineEmployerPromo}
    />
  )
}
