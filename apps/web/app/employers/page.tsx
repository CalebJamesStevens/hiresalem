import Link from "next/link"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { JsonLd } from "@/components/json-ld"
import { buildPageMetadata } from "@/lib/seo"
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqJsonLd } from "@/lib/structured-data"

const employerFaqs = [
  {
    question: "Who should use HireSalem?",
    answer:
      "HireSalem is built for Salem-area employers who want to reach local candidates without relying entirely on a generic national job board."
  },
  {
    question: "What is included on the Free employer setup?",
    answer:
      "Free employer setup includes a public company profile, standard listing visibility, and up to three live jobs at once."
  },
  {
    question: "Why have a public company page if I am not hiring every week?",
    answer:
      "A filled-out company page helps candidates learn about your team, keeps your local brand visible, and gives you a stronger base for future hiring cycles."
  }
]

const employerLinks = [
  {
    href: "/become-business",
    title: "Start employer setup",
    description: "Create your HireSalem business profile and unlock job posting."
  },
  {
    href: "/jobs/salem",
    title: "See the Salem jobs hub",
    description: "Review the candidate-facing Salem jobs page your listings can feed into."
  },
  {
    href: "/jobs",
    title: "Browse the live job board",
    description: "See how current jobs, employers, and local category pages are presented publicly."
  }
]

export const metadata = buildPageMetadata({
  title: "Post Jobs and Hire in Salem Oregon",
  description:
    "Hire in Salem Oregon with a local job board, public company profiles, and focused reach into Salem- and Keizer-area job seekers.",
  path: "/employers",
  keywords: ["post a job Salem Oregon", "hire in Salem Oregon", "Salem Oregon job board", "Salem employers", "Salem hiring"]
})

export default function EmployersPage() {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Employers", href: "/employers" }
  ]

  return (
    <section className="space-y-8">
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
          name: "HireSalem employers",
          description: "Public employer onboarding and hiring paths for Salem Oregon businesses.",
          path: "/employers",
          items: employerLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />
      <JsonLd data={buildFaqJsonLd(employerFaqs)} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Breadcrumbs items={breadcrumbs} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">For Salem employers</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">Post jobs and hire in Salem, Oregon</h1>
            <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-700">
              <p>
                HireSalem is built for employers who want local reach. Instead of dropping a job into a generic national feed, you can publish into a
                Salem-first hiring surface with city pages, category pages, job detail pages, and public company profiles designed around the
                mid-valley market.
              </p>
              <p>
                That matters for Salem, Keizer, and nearby employers who need local candidates to understand the job quickly, compare opportunities,
                and come back to the company page even between hiring cycles.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/become-business" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
                Start employer setup
              </Link>
              <Link href="/jobs/salem" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                Review the Salem jobs hub
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-6 text-slate-50">
            <h2 className="text-xl font-semibold">What employers get</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>Free business setup with a public company profile.</li>
              <li>Up to 3 live jobs on the Free plan.</li>
              <li>Standard visibility across HireSalem listing surfaces.</li>
              <li>Upgrade paths for richer company pages and stronger job visibility when needed.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Local visibility</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Jobs appear in Salem-first browsing paths instead of relying only on broad keyword search.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Company presence</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Employer pages give candidates one place to review active jobs, business details, and brand context.
          </p>
        </article>
        <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Salem market fit</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The site is tuned for Salem, Keizer, and nearby commute patterns rather than a generic national audience.
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {employerLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">Common employer questions</h2>
        <div className="mt-5 space-y-4">
          {employerFaqs.map((item) => (
            <article key={item.question} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
