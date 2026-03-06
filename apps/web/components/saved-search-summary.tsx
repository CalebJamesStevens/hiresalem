import Link from "next/link"

import type { SavedSearch } from "@/lib/saved-searches"

export function SavedSearchSummary({ savedSearches }: { savedSearches: SavedSearch[] }) {
  if (savedSearches.length === 0) {
    return null
  }

  return (
    <section className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Saved searches</h2>
        <Link href="/dashboard/saved-searches" className="text-sm font-medium underline">
          Manage
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {savedSearches.map((savedSearch) => (
          <Link key={savedSearch.id} href={savedSearch.queryString} className="rounded-xl border px-3 py-3 hover:bg-slate-50">
            <p className="font-medium text-slate-900">{savedSearch.name}</p>
            <p className="mt-1 text-xs text-slate-500">{savedSearch.queryString}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
