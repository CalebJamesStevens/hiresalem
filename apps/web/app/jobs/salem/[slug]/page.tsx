import { notFound } from "next/navigation"

import { JobsLandingPageView } from "@/components/jobs-landing-page"
import { normalizeRoles } from "@/lib/authz"
import { searchPublicJobs } from "@/lib/jobs"
import { buildPageMetadata } from "@/lib/seo"
import { getJobsLandingPageBySlug, salemCategoryPages } from "@/lib/seo-taxonomy"
import { getSessionSafe } from "@/lib/session"

type SalemTopicPageProps = {
  params: Promise<{
    slug: string
  }>
}

export const dynamic = "force-dynamic"

export function generateStaticParams() {
  return salemCategoryPages.map((page) => ({
    slug: page.slug
  }))
}

export async function generateMetadata({ params }: SalemTopicPageProps) {
  const { slug } = await params
  const page = getJobsLandingPageBySlug(slug)

  if (!page || !page.path.startsWith("/jobs/salem/")) {
    return buildPageMetadata({
      title: "Salem jobs",
      description: "Salem jobs landing page.",
      path: `/jobs/salem/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  return buildPageMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: page.path,
    keywords: [page.seoTitle, "Salem Oregon jobs", "jobs in Salem Oregon"]
  })
}

export default async function SalemTopicPage({ params }: SalemTopicPageProps) {
  const { slug } = await params
  const page = getJobsLandingPageBySlug(slug)

  if (!page || !page.path.startsWith("/jobs/salem/")) {
    notFound()
  }

  const [searchResult, session] = await Promise.all([searchPublicJobs(page.searchParams), getSessionSafe()])
  const roles = normalizeRoles(session?.user?.roles)
  const showInlineEmployerPromo = !roles.includes("business") && !roles.includes("admin")

  return <JobsLandingPageView page={page} searchResult={searchResult} showInlineEmployerPromo={showInlineEmployerPromo} />
}
