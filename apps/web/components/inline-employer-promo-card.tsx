import Link from "next/link"

export function InlineEmployerPromoCard() {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-slate-50 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] lg:items-center">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">For Salem employers</p>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Need to hire in Salem, Oregon?</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-300">
              Reach local candidates through a Salem-first board, public company profile, and category pages built for the mid-valley market.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/employers" className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950">
              Explore employer options
            </Link>
            <Link href="/become-business" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white">
              Start a business profile
            </Link>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white/10 p-4">
          <h3 className="text-base font-semibold">Employer basics</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
            <li>Free setup includes a public company profile and up to 3 live jobs.</li>
            <li>Listings feed into Salem and category-specific hiring paths.</li>
            <li>Stronger profile and visibility options are available when needed.</li>
          </ul>
        </div>
      </div>
    </article>
  )
}
