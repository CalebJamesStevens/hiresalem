import Link from "next/link"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { LinkCardGrid } from "@/components/link-card-grid"
import type { ResourceArticle } from "@/lib/seo-taxonomy"
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqJsonLd } from "@/lib/structured-data"

export function ResourceArticlePageView({ article }: { article: ResourceArticle }) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Resources", href: "/resources" },
    { name: article.heroTitle, href: article.path }
  ]

  return (
    <article className="space-y-8">
      <JsonLd
        data={buildBreadcrumbJsonLd(
          breadcrumbs.map((item) => ({
            name: item.name,
            path: item.href
          }))
        )}
      />
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: article.seoTitle,
          description: article.seoDescription,
          path: article.path,
          items: article.relatedLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />
      <JsonLd
        data={buildArticleJsonLd({
          headline: article.heroTitle,
          description: article.seoDescription,
          path: article.path
        })}
      />
      <JsonLd data={buildFaqJsonLd(article.faqs)} />

      <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Breadcrumbs items={breadcrumbs} />
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Salem job seeker guide</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">{article.heroTitle}</h1>
        </div>
        <div className="space-y-4">
          {article.intro.map((paragraph) => (
            <p key={paragraph} className="max-w-3xl text-base leading-7 text-slate-700">
              {paragraph}
            </p>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/jobs/salem" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
            Browse Salem jobs
          </Link>
          <Link href="/jobs" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
            Open all listings
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="space-y-6">
          {article.sections.map((section) => (
            <section key={section.heading} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-7 text-slate-700">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-50 shadow-sm">
            <h2 className="text-xl font-semibold">How to use this guide</h2>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              Read the guide, then jump back into the jobs pages linked below so you can apply the advice immediately while the openings are fresh.
            </p>
          </section>
          <LinkCardGrid title="Related pages" items={article.relatedLinks} columns="grid-cols-1" />
        </aside>
      </div>

      {article.faqs.length > 0 ? <FaqSection title="FAQ" items={article.faqs} /> : null}
    </article>
  )
}
