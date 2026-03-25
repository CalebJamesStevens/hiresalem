import Link from "next/link"

import { Breadcrumbs } from "@/components/breadcrumbs"
import { FaqSection } from "@/components/faq-section"
import { JsonLd } from "@/components/json-ld"
import { getEmployerStartHref } from "@/lib/employer-self-serve"
import { EMPLOYER_ADD_ONS, EMPLOYER_FAQS, EMPLOYER_PRICING_EXPLANATIONS, EMPLOYER_PRICING_PLANS } from "@/lib/employer-pricing"
import { buildPageMetadata } from "@/lib/seo"
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd, buildFaqJsonLd } from "@/lib/structured-data"

const employerLinks = [
  {
    href: getEmployerStartHref("free"),
    title: "Start employer setup",
    description: "Launch your Community account and claim a Salem-first business presence."
  },
  {
    href: "/dashboard/plan",
    title: "Review plan options",
    description: "Compare Community, Standard, and Partner from the employer billing view."
  },
  {
    href: "/jobs",
    title: "See the live board",
    description: "Review how Spotlight jobs, company pages, and local listings appear to candidates."
  }
]

export const metadata = buildPageMetadata({
  title: "Hire Local Talent in Salem Oregon",
  description:
    "Compare HireSalem employer pricing, Spotlight visibility, enhanced business profiles, and Salem-first hiring options for Mid-Willamette Valley teams.",
  path: "/employers",
  keywords: ["Salem employer pricing", "post a job Salem Oregon", "hire local talent Salem", "Salem Oregon job board pricing", "HireSalem employers"]
})

export default function EmployersPage() {
  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Employers", href: "/employers" }
  ]

  return (
    <section className="space-y-6 md:space-y-8">
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
          name: "HireSalem employer pricing",
          description: "Pricing, add-ons, and FAQs for Salem-area employers hiring on HireSalem.",
          path: "/employers",
          items: employerLinks.map((item) => ({
            name: item.title,
            path: item.href
          }))
        })}
      />
      <JsonLd data={buildFaqJsonLd([...EMPLOYER_FAQS])} />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="hidden md:block">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <div className="mt-0 grid gap-6 md:mt-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">For Salem-first employers</p>
            <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">Find the best local talent in Salem</h1>
            <div className="max-w-3xl space-y-4 text-base leading-7 text-slate-700">
              <p>
                Stop getting buried by national corporations on giant job boards. HireSalem puts your roles in front of people who actually live, work,
                and commute in the Mid-Willamette Valley.
              </p>
              <p>
                The pitch is simple: local audience, local context, and a cleaner employer presence that feels more credible than dropping a job into a
                generic national feed.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={getEmployerStartHref("free")} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white">
                Start employer setup
              </Link>
              <Link href="/dashboard/plan#pricing" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900">
                View pricing
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-slate-950 p-6 text-slate-50">
            <h2 className="text-xl font-semibold">Why the Salem-first audience converts</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-200">
              <li>Your jobs compete against local employers, not national noise.</li>
              <li>Candidates see Salem, Keizer, and Mid-Valley context immediately.</li>
              <li>Enhanced business pages help local seekers decide faster.</li>
              <li>Spotlight placement lets important roles own the top of the page.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="pricing" className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Pricing</p>
          <h2 className="text-3xl font-semibold text-slate-950">Simple plans for serious local hiring</h2>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">
            Choose the plan that matches your hiring tempo. Community is built for occasional hiring, Standard for recurring local recruiting, and
            Partner for premium employer visibility.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {EMPLOYER_PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`flex h-full flex-col rounded-[1.75rem] border p-6 shadow-sm ${plan.id === "standard" ? "border-slate-900 bg-slate-950 text-slate-50" : "border-slate-200 bg-white text-slate-950"}`}
            >
              <div className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${plan.id === "standard" ? "text-slate-300" : "text-slate-500"}`}>
                  {plan.eyebrow}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-semibold">{plan.name}</h3>
                  {plan.id === "standard" ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-950">Recommended</span>
                  ) : null}
                </div>
                <p className="text-3xl font-semibold">{plan.priceLabel}</p>
                <p className={`text-sm leading-6 ${plan.id === "standard" ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
              </div>

              <ul className={`mt-5 flex-1 space-y-3 text-sm leading-6 ${plan.id === "standard" ? "text-slate-200" : "text-slate-700"}`}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Link
                href={plan.publicCtaHref}
                className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium ${
                  plan.id === "standard" ? "bg-white text-slate-950" : "bg-slate-900 text-white"
                }`}
              >
                {plan.publicCtaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {EMPLOYER_PRICING_EXPLANATIONS.map((item) => (
          <article key={item.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
          </article>
        ))}
      </section>

      <section id="add-ons" className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Add-ons</p>
          <h2 className="text-2xl font-semibold text-slate-950">Need a quick boost?</h2>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {EMPLOYER_ADD_ONS.map((item) => (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{item.priceLabel}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {employerLinks.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h2 className="text-lg font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
          </Link>
        ))}
      </section>

      <FaqSection title="Employer FAQ" items={[...EMPLOYER_FAQS]} />
    </section>
  )
}
