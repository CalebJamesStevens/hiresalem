import type { FaqItem } from "@/lib/seo-taxonomy"

export function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  return (
    <section className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.question} className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-900">{item.question}</h3>
            <p className="text-sm leading-7 text-slate-700">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
