import Link from "next/link"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { LinkCardGrid } from "@/components/link-card-grid"
import { markdownToHtml } from "@/lib/markdown"
import { EDITORIAL_CONTENT_LAST_MODIFIED, type ResourceArticle } from "@/lib/seo-taxonomy"
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqJsonLd } from "@/lib/structured-data"

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://")
}

export function ResourceArticlePageView({ article }: { article: ResourceArticle }) {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Resources", href: "/resources" },
    { name: article.heroTitle, href: article.path }
  ]
  const markdownBodyHtml = article.markdownBody ? markdownToHtml(article.markdownBody) : null
  const updatedLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(EDITORIAL_CONTENT_LAST_MODIFIED)

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
          path: article.path,
          datePublished: EDITORIAL_CONTENT_LAST_MODIFIED,
          dateModified: EDITORIAL_CONTENT_LAST_MODIFIED
        })}
      />
      <JsonLd data={buildFaqJsonLd(article.faqs)} />

      <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Breadcrumbs items={breadcrumbs} />
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Salem job seeker guide</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">{article.heroTitle}</h1>
          <p className="text-sm text-slate-500">Updated {updatedLabel}</p>
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

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="min-w-0">
          {markdownBodyHtml ? (
            <div
              className="min-w-0 space-y-4 [&_a]:break-all [&_a]:font-medium [&_a]:text-slate-900 [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:overflow-x-auto [&_code]:break-all [&_h1]:break-words [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:break-words [&_h2]:pt-4 [&_h3]:break-words [&_li]:break-words [&_ol]:space-y-2 [&_p]:break-words [&_pre]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_ul]:space-y-2"
              dangerouslySetInnerHTML={{ __html: markdownBodyHtml }}
            />
          ) : (
            article.sections.map((section, index) => (
              <section
                key={section.heading}
                className={index === 0 ? "" : "mt-8 border-t border-slate-200 pt-8"}
              >
                <h2 className="text-2xl font-semibold text-slate-950">{section.heading}</h2>
                {section.paragraphs?.length ? (
                  <div className="mt-4 space-y-4">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph} className="text-base leading-7 text-slate-700">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {section.resources?.length ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {section.resources.map((resource) => {
                      const external = isExternalHref(resource.href)

                      return (
                        <a
                          key={resource.href}
                          href={resource.href}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          target={external ? "_blank" : undefined}
                          rel={external ? "noreferrer" : undefined}
                        >
                          <div className="space-y-2">
                            <p className="text-lg font-semibold text-slate-900">{resource.title}</p>
                            <p className="text-sm leading-6 text-slate-600">{resource.description}</p>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                ) : null}
              </section>
            ))
          )}
        </div>
      </div>

      {article.faqs.length > 0 ? <FaqSection title="FAQ" items={article.faqs} /> : null}
      <LinkCardGrid title="Related pages" items={article.relatedLinks} columns="md:grid-cols-3" />
    </article>
  )
}
