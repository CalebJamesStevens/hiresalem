import Link from "next/link"

import type { LinkCard } from "@/lib/seo-taxonomy"

export function LinkCardGrid({
  title,
  items,
  columns = "md:grid-cols-2"
}: {
  title: string
  items: LinkCard[]
  columns?: string
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      </div>
      <div className={`grid gap-4 ${columns}`}>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
