import { notFound } from "next/navigation"

import { ResourceArticlePageView } from "@/components/resource-article-page"
import { getResourceArticleBySlug, resourceArticles } from "@/lib/seo-taxonomy"
import { buildPageMetadata } from "@/lib/seo"

type ResourceArticlePageProps = {
  params: Promise<{
    slug: string
  }>
}

export function generateStaticParams() {
  return resourceArticles.map((article) => ({
    slug: article.slug
  }))
}

export async function generateMetadata({ params }: ResourceArticlePageProps) {
  const { slug } = await params
  const article = getResourceArticleBySlug(slug)

  if (!article) {
    return buildPageMetadata({
      title: "Resource not found",
      description: "The requested Salem job search guide could not be found.",
      path: `/resources/${slug}`,
      robots: {
        index: false,
        follow: false
      }
    })
  }

  return buildPageMetadata({
    title: article.seoTitle,
    description: article.seoDescription,
    path: article.path,
    keywords: [article.seoTitle, "Salem jobs", "local hiring guide"]
  })
}

export default async function ResourceArticlePage({ params }: ResourceArticlePageProps) {
  const { slug } = await params
  const article = getResourceArticleBySlug(slug)

  if (!article) {
    notFound()
  }

  return <ResourceArticlePageView article={article} />
}
