import { notFound } from "next/navigation"

import { JobsLandingPageView } from "@/components/jobs-landing-page"
import { searchPublicJobs } from "@/lib/jobs"
import { buildPageMetadata } from "@/lib/seo"
import { getJobsLandingPageBySlug } from "@/lib/seo-taxonomy"

const pageContent = getJobsLandingPageBySlug("salem")

export const revalidate = 900

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

  const searchResult = await searchPublicJobs(pageContent.searchParams)

  return <JobsLandingPageView page={pageContent} searchResult={searchResult} />
}
