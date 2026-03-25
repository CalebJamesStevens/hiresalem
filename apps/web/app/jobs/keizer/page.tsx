import { notFound } from "next/navigation"

import { JobsLandingPageView } from "@/components/jobs-landing-page"
import { normalizeRoles } from "@/lib/authz"
import { searchPublicJobs } from "@/lib/jobs"
import { buildPageMetadata } from "@/lib/seo"
import { getJobsLandingPageBySlug } from "@/lib/seo-taxonomy"
import { getSessionSafe } from "@/lib/session"

const pageContent = getJobsLandingPageBySlug("keizer")

export const dynamic = "force-dynamic"

export const metadata = pageContent
  ? buildPageMetadata({
      title: pageContent.seoTitle,
      description: pageContent.seoDescription,
      path: pageContent.path,
      keywords: ["Keizer Oregon jobs", "Keizer jobs", "North Salem jobs"]
    })
  : undefined

export default async function KeizerJobsLandingPage() {
  if (!pageContent) {
    notFound()
  }

  const [searchResult, session] = await Promise.all([searchPublicJobs(pageContent.searchParams), getSessionSafe()])
  const roles = normalizeRoles(session?.user?.roles)
  const showInlineEmployerPromo = !roles.includes("business") && !roles.includes("admin")

  return <JobsLandingPageView page={pageContent} searchResult={searchResult} showInlineEmployerPromo={showInlineEmployerPromo} />
}
