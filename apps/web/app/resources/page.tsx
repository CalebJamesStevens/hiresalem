import Link from "next/link"

import { JsonLd } from "@/components/json-ld"
import { LinkCardGrid } from "@/components/link-card-grid"
import { allResourceArticleLinks } from "@/lib/seo-taxonomy"
import { buildPageMetadata } from "@/lib/seo"
import { buildCollectionPageJsonLd } from "@/lib/structured-data"

export const metadata = buildPageMetadata({
  title: "Salem Job Search Resources",
  description:
    "Read Salem-specific job seeker guides covering resumes, healthcare hiring, where to search locally, and how to compare Salem with Keizer.",
  path: "/resources",
  keywords: ["Salem job search tips", "Salem resume tips", "Salem healthcare hiring", "Keizer job market"]
})

export default function ResourcesPage() {
  return (
    <section className="space-y-8">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "Salem job search resources",
          description: "Guides for Salem-area job seekers using HireSalem.",
          path: "/resources",
          items: allResourceArticleLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Local hiring guides</p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">Salem job search resources</h1>
          <p className="max-w-3xl text-base leading-7 text-slate-700">
            These guides are written for Salem-area job seekers who want better local search habits, stronger applications, and a clearer view of
            the Salem and Keizer market.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/jobs/salem" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
              Browse Salem jobs
            </Link>
            <Link href="/jobs" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
              Open all listings
            </Link>
          </div>
        </div>
      </section>

      <LinkCardGrid title="Browse the guides" items={allResourceArticleLinks} columns="md:grid-cols-2" />
    </section>
  )
}
